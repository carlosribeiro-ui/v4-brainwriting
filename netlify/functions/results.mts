import type { Config } from "@netlify/functions";
import { fetchResultsSummary } from "./db.mts";

export default async () => {
  try {
    const summary = await fetchResultsSummary();
    return new Response(JSON.stringify(summary), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Falha ao carregar resultados." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};

export const config: Config = {
  path: "/api/results"
};
