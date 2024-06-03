import { Router } from "../../shared/neorest/Router.ts";
import { BackServices } from "./backServices.ts";

export function rootController(services: BackServices) {
  const router = services.router;

  router.onGet("/", (ctx) => {
    ctx.response = {
      version: "0.1.0",
      type: "local",
      workspacePath: services.db ? services.db.workspaceDir : "",
    };
  });
}