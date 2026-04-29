import type { Config } from "@netlify/functions";
import { fetchResultsSummary, insertVoteSubmission, normalizeVotes } from "./db.mts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export default async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Método não suportado." }, 405);
    }

    const body = await req.json().catch(() => null);
    const votes = normalizeVotes(body?.votes);

    if (votes.length === 0) {
      return json({ error: "Nenhum voto válido foi enviado." }, 400);
    }

    await insertVoteSubmission(votes);
    const summary = await fetchResultsSummary();
    return json({ ok: true, ...summary });
  } catch (error) {
    console.error(error);
    return json({ error: "Falha ao registrar votação." }, 500);
  }
};

export const config: Config = {
  path: "/api/vote"
};
