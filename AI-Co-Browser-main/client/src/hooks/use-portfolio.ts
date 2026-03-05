import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function usePortfolio() {
  return useQuery({
    queryKey: [api.portfolio.get.path],
    queryFn: async () => {
      const res = await fetch(api.portfolio.get.path);
      if (!res.ok) throw new Error("Failed to fetch portfolio data");
      return api.portfolio.get.responses[200].parse(await res.json());
    },
  });
}
