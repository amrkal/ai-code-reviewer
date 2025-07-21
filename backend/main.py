import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import openai
import os
from urllib.parse import urlparse
import requests

load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeInput(BaseModel):
    code: str


class RepoInput(BaseModel):
    url: str

@app.post("/review_repo")
async def review_repo(input: RepoInput):
    try:
        parsed = urlparse(input.url)
        parts = parsed.path.strip("/").split("/")

        if len(parts) < 2:
            raise Exception("Invalid GitHub URL")

        user, repo = parts[0], parts[1]

        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"token {os.getenv('GITHUB_TOKEN')}"
        }

        # Detect branch and path
        branch = "main"
        sub_path = ""

        if "tree" in parts:
            tree_index = parts.index("tree")
            if len(parts) > tree_index + 1:
                branch = parts[tree_index + 1]
            if len(parts) > tree_index + 2:
                sub_path = "/".join(parts[tree_index + 2:])
        elif "blob" in parts:
            blob_index = parts.index("blob")
            if len(parts) < blob_index + 3:
                raise Exception("Invalid blob URL structure")

            branch = parts[blob_index + 1]
            file_path = "/".join(parts[blob_index + 2:])
            raw_url = f"https://raw.githubusercontent.com/{user}/{repo}/{branch}/{file_path}"

            # Fetch raw file content
            res = requests.get(raw_url)
            if res.status_code != 200:
                raise Exception(f"Failed to fetch raw file: {raw_url}")

            code = res.text
            result = call_gpt_review(code)

            return {"reviews": [{"file": file_path, **result}]}


        # Step 1: Get default branch (fallback)
        if not branch:
            branch = fetch_default_branch(user, repo, headers)

        # Step 2: Build base URL to contents API
        api_path = f"/{sub_path}" if sub_path else ""
        base_url = f"https://api.github.com/repos/{user}/{repo}/contents{api_path}?ref={branch}"

        # Step 3: Fetch and review files
        files = collect_repo_files(base_url, headers)
        print(f"[DEBUG] Collected {len(files)} files for review")
        return {"reviews": await review_files(files)}

    except Exception as e:
        print("[ERROR]", str(e))
        raise HTTPException(status_code=500, detail=str(e))



def fetch_default_branch(user: str, repo: str, headers: dict) -> str:
    url = f"https://api.github.com/repos/{user}/{repo}"
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch repo info: {res.status_code}")
    return res.json().get("default_branch", "main")



def collect_repo_files(api_url: str, headers: dict) -> list:
    reviewed = set()
    collected = []

    res = requests.get(api_url, headers=headers)
    if res.status_code != 200:
        print(f"[WARN] Skipped URL (status {res.status_code}): {api_url}")
        return []

    for item in res.json():
        if item["type"] == "file" and valid_code_file(item["name"]) and item["download_url"] not in reviewed:
            reviewed.add(item["download_url"])
            collected.append(item)
    
    # No recursion — only scans root folder
    return collected
# def collect_repo_files(api_url: str, headers: dict) -> list:
#     reviewed = set()
#     collected = []

#     def recurse(url):
#         res = requests.get(url, headers=headers)
#         if res.status_code != 200:
#             print(f"[WARN] Skipped URL (status {res.status_code}): {url}")
#             return
#         for item in res.json():
#             if item["type"] == "file" and valid_code_file(item["name"]) and item["download_url"] not in reviewed:
#                 reviewed.add(item["download_url"])
#                 collected.append(item)
#             elif item["type"] == "dir":
#                 recurse(item["url"])

#     recurse(api_url)
#     return collected


def valid_code_file(filename: str) -> bool:
    return any(filename.endswith(ext) for ext in [".py", ".js", ".ts", ".cpp", ".java"])


async def review_files(files: list) -> list:
    results = []
    for f in files:
        try:
            code = requests.get(f["download_url"]).text
            result = call_gpt_review(code)
            results.append({"file": f["name"], **result})
        except Exception as e:
            results.append({"file": f["name"], "error": str(e)})
    return results


def call_gpt_review(code: str) -> dict:
    try:
        # Avoid sending overly long prompts
        if len(code) > 15000:
            return {
                "error": "Skipped: File too large for analysis (token limit exceeded)"
            }

        prompt = f"""You are a strict JSON API.

Review this code and return only a valid JSON object with:
- readability_score (1-10)
- code_quality_score (1-10)
- best_practices_score (1-10)
- bug_risk_score (1-10)
- detailed_suggestions (array of bullet points)

Only return raw JSON.

Code:
{code}
"""
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}


@app.post("/review_code")
async def review_code(input: CodeInput):
    try:
        return call_gpt_review(input.code)
    except Exception as e:
        print("[ERROR] GPT failed:", str(e))
        return {
            "error": "Failed to process code",
            "raw": getattr(e, "message", str(e))
        }


@app.post("/recent_files")
def get_last_commit_files(user: str, repo: str):
    try:
        files = fetch_commit_changed_files(user, repo)
        return [f for f in files if valid_code_file(f["filename"])]
    except Exception as e:
        print("[ERROR] Failed to get recent files:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

class DiffRepoInput(BaseModel):
    url: str


@app.post("/review_commit_diff")
async def review_commit_diff(input: DiffRepoInput):
    try:
        parsed = urlparse(input.url)
        parts = parsed.path.strip("/").split("/")
        if len(parts) < 2:
            raise Exception("Invalid GitHub URL")

        user, repo = parts[0], parts[1]
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"token {os.getenv('GITHUB_TOKEN')}"
        }

        # Get latest commit
        commits_url = f"https://api.github.com/repos/{user}/{repo}/commits"
        commits_res = requests.get(commits_url, headers=headers)
        if commits_res.status_code != 200:
            raise Exception("Failed to fetch commits")
        commits_json = commits_res.json()
        if not isinstance(commits_json, list) or not commits_json:
            raise Exception("No commits found")

        latest_commit = commits_json[0]
        parent_sha = latest_commit["parents"][0]["sha"]
        current_sha = latest_commit["sha"]

        # Get list of changed files
        commit_details = requests.get(latest_commit["url"], headers=headers).json()
        files = commit_details.get("files", [])
        if not files:
            raise Exception("No changed files in the latest commit")

        results = []

        for f in files:
            filename = f["filename"]
            if not valid_code_file(filename):
                continue

            try:
                raw_new = f"https://raw.githubusercontent.com/{user}/{repo}/{current_sha}/{filename}"
                raw_old = f"https://raw.githubusercontent.com/{user}/{repo}/{parent_sha}/{filename}"

                new_code = requests.get(raw_new).text
                old_res = requests.get(raw_old)
                old_code = old_res.text if old_res.status_code == 200 else ""

                result = call_gpt_review(new_code)
                results.append({
                    "file": filename,
                    "old_code": old_code,
                    "new_code": new_code,
                    **result
                })

            except Exception as fetch_err:
                results.append({
                    "file": filename,
                    "error": f"Failed to fetch or review file: {str(fetch_err)}"
                })

        return {"reviews": results}

    except Exception as e:
        print("[ERROR] Commit diff review failed:", str(e))
        raise HTTPException(status_code=500, detail=f"Commit diff review failed: {str(e)}")


def fetch_commit_changed_files(user: str, repo: str) -> list:
    commits_url = f"https://api.github.com/repos/{user}/{repo}/commits"
    commit_data = requests.get(commits_url).json()
    latest_sha = commit_data[0]["sha"]

    commit_url = f"https://api.github.com/repos/{user}/{repo}/commits/{latest_sha}"
    files = requests.get(commit_url).json().get("files", [])
    return files


@app.post("/diff_view")
async def diff_view(input: DiffRepoInput):
    try:
        parsed = urlparse(input.url)
        user, repo = parsed.path.strip("/").split("/")[:2]

        # Get latest commit
        commits_url = f"https://api.github.com/repos/{user}/{repo}/commits"
        commits_res = requests.get(commits_url)
        if commits_res.status_code != 200:
            raise Exception("Failed to fetch commits")
        latest_commit = commits_res.json()[0]

        files = latest_commit.get("files", [])
        if not files:
            commit_url = latest_commit["url"]
            commit_details = requests.get(commit_url).json()
            files = commit_details.get("files", [])

        diffs = []
        for f in files:
            if f["status"] not in ["modified", "added"]:
                continue
            filename = f["filename"]
            ext = os.path.splitext(filename)[1]
            if ext not in [".py", ".js", ".ts", ".cpp", ".java"]:
                continue

            new_url = f["raw_url"]
            new_code = requests.get(new_url).text

            old_code = ""
            if f["status"] == "modified":
                patch_url = f["contents_url"] if "contents_url" in f else None
                blob_url = f["previous_filename"] if "previous_filename" in f else None
                if "sha" in f:
                    # Use SHA to fetch old version
                    raw_url = f"https://raw.githubusercontent.com/{user}/{repo}/{latest_commit['parents'][0]['sha']}/{filename}"
                    old_code_res = requests.get(raw_url)
                    if old_code_res.status_code == 200:
                        old_code = old_code_res.text

            diffs.append({
                "file": filename,
                "old_code": old_code,
                "new_code": new_code,
            })

        return {"diffs": diffs}

    except Exception as e:
        print("[ERROR] Diff view failed:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

