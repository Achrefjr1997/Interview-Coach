import io
import json
import re
from app.llm import chat
from app.graph.cv_state import CVPipelineState

BLOCK_EXTRACTOR_PROMPT = (
    "You are a document structure analyzer. Your ONLY job is to locate and COPY verbatim sections from a CV/resume. "
    "Do NOT summarize, interpret, or modify any text. Copy exactly what is written.\n\n"
    "Look for these four block types:\n\n"
    "1. **skills_block**: The dedicated skills/technologies section. Usually labeled 'Skills', "
    "'Technical Skills', 'Technologies', 'Tech Stack', 'Technical Skills and Interests'. "
    "Copy the ENTIRE content of this section.\n\n"
    "2. **experience_blocks**: Each individual job entry. Split by job title/company header. "
    "For each job, copy the ENTIRE description including embedded technology mentions ('Technologies:' lines). "
    "Return as an array of strings (one per job). If there is only one job, still return as a single-element array.\n\n"
    "3. **projects_block**: The projects section. Copy the ENTIRE content.\n\n"
    "4. **certifications_block**: Any technical certifications listed. Copy the ENTIRE content.\n\n"
    "If a block type does not exist, return null for that field.\n"
    "Return ONLY valid JSON (no markdown fences, no extra text):\n"
    '{\n'
    '  "skills_block": "<verbatim text or null>",\n'
    '  "experience_blocks": ["<job 1 full text>", "<job 2 full text>", ...],\n'
    '  "projects_block": "<verbatim text or null>",\n'
    '  "certifications_block": "<verbatim text or null>"\n'
    '}\n'
)

SKILL_EXTRACTOR_PROMPT = (
    "List EVERY technical tool, technology, framework, library, database, language, protocol, platform, "
    "or AI/ML technique explicitly mentioned in this text. Be EXHAUSTIVE — list ALL of them, even if there are 30+.\n"
    "Include: programming languages, ML/DL frameworks, databases, cloud services, DevOps tools, MLops tools, "
    "data tools, monitoring tools, acceleration tools, version control, APIs, protocols, libraries.\n"
    "Use lowercase snake_case. Skip job titles, company names, education, soft skills, years.\n"
    "Return ONLY valid JSON: {\"skills\": [\"python\", \"pytorch\", \"neo4j\", ...]}\n"
    "CRITICAL: List EVERY SINGLE technical term you see. Do not stop after 10. Keep going until you have them all."
)

NORMALIZE_PROMPT = (
    "Normalize these technical skill names to canonical snake_case form. "
    "Return ONLY valid JSON: {\"skills\": [{\"canonical_name\": \"...\", \"display_name\": \"...\"}, ...]}\n"
    "Rules: 'React.js'/'ReactJS' → canonical 'react', display 'React'. "
    "'Postgres' → canonical 'postgresql', display 'PostgreSQL'. "
    "'K8s' → canonical 'kubernetes', display 'Kubernetes'. "
    "'scikit-learn' → canonical 'scikit_learn', display 'Scikit-learn'. "
    "Expand common abbreviations: 'RAG' → 'rag', display 'RAG'. "
    "Keep distinct tools separate. Remove non-technical terms."
)


def cv_parser(state: CVPipelineState) -> dict:
    file_bytes = state.get("file_bytes")
    filename = state.get("filename", "")

    if not file_bytes:
        return {"error": "No file uploaded"}

    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    raw_text = _extract_text(file_bytes, ext)
    if raw_text is None:
        return {"error": f"Unsupported file type: .{ext}"}

    if not raw_text.strip():
        return {"error": "Could not extract text from file."}

    print(f"[CV PARSER DEBUG] Raw text extracted: {len(raw_text)} chars")
    print(f"[CV PARSER DEBUG] First 600 chars:\n{raw_text[:600]}\n---END---")

    # ── Step 1: Block extraction ──
    blocks_raw = re.sub(r"```json|```", "", chat([
        {"role": "system", "content": BLOCK_EXTRACTOR_PROMPT},
        {"role": "user",   "content": raw_text},
    ], temperature=0.0)).strip()

    try:
        blocks = json.loads(blocks_raw)
    except json.JSONDecodeError:
        return {"error": f"Block extraction failed. Response: {blocks_raw[:200]}"}

    # Normalize experience_blocks: ensure it's a list
    exp_blocks = blocks.get("experience_blocks", [])
    if isinstance(exp_blocks, str):
        exp_blocks = [exp_blocks]
    if exp_blocks is None:
        exp_blocks = []

    print(f"[CV PARSER DEBUG] Blocks extracted:")
    print(f"  skills_block: {len(blocks.get('skills_block') or '')} chars")
    print(f"  experience_blocks: {len(exp_blocks)} jobs")
    for i, job in enumerate(exp_blocks):
        print(f"    job[{i}]: {len(job)} chars")
    print(f"  projects_block: {len(blocks.get('projects_block') or '')} chars")
    print(f"  certifications_block: {len(blocks.get('certifications_block') or '')} chars")

    # ── Step 2: Skill extraction per block ──
    all_skills = []  # [{raw_name, block_type}, ...]

    def extract_from(text, block_label):
        if not text or not text.strip():
            return
        raw = re.sub(r"```json|```", "", chat([
            {"role": "system", "content": SKILL_EXTRACTOR_PROMPT},
            {"role": "user",   "content": text},
        ], temperature=0.0)).strip()
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            print(f"[CV PARSER DEBUG] Skill extraction JSON parse failed for block '{block_label}': {raw[:200]}")
            return
        found = len(result.get("skills", []))
        print(f"[CV PARSER DEBUG]   block '{block_label}' → {found} skills: {result.get('skills', [])}")
        for name in result.get("skills", []):
            if name and len(str(name)) >= 2:
                all_skills.append({"raw_name": str(name), "block_type": block_label})

    # Extract from skills block
    skills_text = blocks.get("skills_block")
    if skills_text:
        extract_from(skills_text, "skills")

    # Extract from each experience block individually
    for job_text in exp_blocks:
        if job_text:
            extract_from(job_text, "experience")

    # Extract from projects
    projects_text = blocks.get("projects_block")
    if projects_text:
        extract_from(projects_text, "projects")

    # Extract from certifications
    certs_text = blocks.get("certifications_block")
    if certs_text:
        extract_from(certs_text, "certifications")

    if not all_skills:
        # Fallback: full LLM parse
        return _fallback_parse(raw_text)

    # ── Step 3: Merge, deduplicate, score ──
    merged = {}  # canonical_name → {display_name, block_count, block_types}

    for s in all_skills:
        raw = s["raw_name"]
        cname = _normalize(raw)
        if not cname or len(cname) < 2:
            continue

        display = raw.strip().replace("_", " ").title()
        if cname in merged:
            existing = merged[cname]
            if s["block_type"] not in existing["block_types"]:
                existing["block_types"].append(s["block_type"])
        else:
            merged[cname] = {
                "display_name": display,
                "block_types": [s["block_type"]],
            }

    # Sort by block_count desc (most evidence first)
    sorted_skills = sorted(merged.items(), key=lambda kv: -len(kv[1]["block_types"]))

    print(f"[CV PARSER DEBUG] Total raw hits: {len(all_skills)}, unique skills after dedup: {len(sorted_skills)}")
    print(f"[CV PARSER DEBUG] Final skills: {[name for name, _ in sorted_skills]}")

    final_skills = []
    skill_details = []

    for cname, data in sorted_skills:
        block_count = len(data["block_types"])
        # Confidence based on block count: 3+ blocks = 1.0, 2 blocks = 0.85, 1 block = 0.7
        if block_count >= 3:
            confidence = 1.0
        elif block_count == 2:
            confidence = 0.85
        else:
            confidence = 0.7

        source = "explicit" if block_count >= 2 else "inferred"

        final_skills.append(cname)
        skill_details.append({
            "canonical_name": cname,
            "display_name": data["display_name"],
            "confidence": confidence,
            "block_count": block_count,
            "block_types": data["block_types"],
            "source": source,
        })

    # Also do a full-schema parse for role/seniority/etc.
    meta = _full_schema_parse(raw_text)
    if "error" not in meta:
        meta["skills"] = final_skills[:50]
        meta["skill_details"] = skill_details[:50]
        return {"cv_profile": meta}
    else:
        return {"error": meta.get("error")}


def _full_schema_parse(text: str) -> dict:
    prompt = (
        "You are a technical CV parser. Return ONLY valid JSON (no markdown fences).\n"
        '{\n'
        '  "role": "<current or most recent job title>",\n'
        '  "seniority": "entry|junior|mid|senior|staff",\n'
        '  "years_experience": <integer>,\n'
        '  "primary_language": "<main programming language>",\n'
        '  "domains": ["<domain 1>", "<domain 2>", ...],\n'
        '  "education": "<highest degree and field>",\n'
        '  "gaps": ["<weakly evidenced or aspirational skill>", ...]\n'
        '}\n'
        "'seniority' must be exactly one of: entry, junior, mid, senior, staff.\n"
        "Use snake_case for gap names.\n"
    )
    raw = re.sub(r"```json|```", "", chat([
        {"role": "system", "content": prompt},
        {"role": "user",   "content": text[:6000]},
    ], temperature=0.1)).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": f"Metadata parse failed: {raw[:200]}"}
    if "role" not in data or "seniority" not in data:
        return {"error": "Metadata missing required fields"}
    return data


def _fallback_parse(raw_text: str) -> dict:
    """Single-pass parse as last resort."""
    prompt = (
        "Analyze this CV and return ONLY valid JSON:\n"
        '{"role":"...","seniority":"...","years_experience":0,"skills":["..."],"primary_language":"...",'
        '"domains":["..."],"education":"...","gaps":["..."]}\n'
        "Extract ALL technical skills. Use snake_case."
    )
    raw = re.sub(r"```json|```", "", chat([
        {"role": "system", "content": prompt},
        {"role": "user",   "content": raw_text[:8000]},
    ], temperature=0.1)).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": f"Fallback parse failed: {raw[:200]}"}
    if "role" not in data or "skills" not in data:
        return {"error": "Fallback parse missing required fields"}
    return {"cv_profile": data}


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9_]", "", name.lower().replace(" ", "_").replace("-", "_").replace(".", "_")).strip("_")


def _extract_text(file_bytes: bytes, ext: str) -> str | None:
    if ext == "pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n".join(pages)
        except Exception:
            return None
    elif ext == "docx":
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return None
    return None
