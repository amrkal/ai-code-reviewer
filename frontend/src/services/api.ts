// src/services/api.ts
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

export async function reviewCode(code: string) {
  const response = await axios.post(`${BASE_URL}/review_code`, { code });
  return response.data;
}

export async function reviewRepo(url: string) {
  const response = await axios.post(`${BASE_URL}/review_repo`, { url });
  return response.data;
}

export async function reviewCommitDiff(url: string) {
  const response = await axios.post(`${BASE_URL}/review_commit_diff`, { url });
  return response.data;
}

export async function fetchDiffView(url: string) {
  const response = await axios.post(`${BASE_URL}/diff_view`, { url });
  return response.data;
}