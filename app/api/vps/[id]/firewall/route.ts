import { apiGet, apiMutation, parseJsonBody, requireRouteParam } from "@/lib/api/handlers";
import { addFirewallPlan, deleteFirewallPlans, getFirewallPlans } from "@/lib/virtualizor/actions";
import { firewallDeleteSchema, firewallRuleSchema } from "@/lib/virtualizor/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiGet(async (_request, context) => getFirewallPlans(await requireRouteParam(context, "id")));

export const POST = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const input = await parseJsonBody(request, firewallRuleSchema);
  return addFirewallPlan(input, id);
});

export const DELETE = apiMutation(async (request, context) => {
  const id = await requireRouteParam(context, "id");
  const { planIds } = await parseJsonBody(request, firewallDeleteSchema);
  return deleteFirewallPlans(planIds, id);
});
