import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

export async function reviewCode(code: string): Promise<any> {
  const response = await fetch("http://127.0.0.1:8000/review_code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  return await response.json();
}

