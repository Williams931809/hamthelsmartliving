import { storeApi } from "../lib/store-api";
import storefrontHtml from "../lib/storefront-html";
import marketplaceHtml from "../lib/marketplace-html";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    if(url.pathname.length>1&&url.pathname.endsWith('/')&&!url.pathname.startsWith('/api/')){url.pathname=url.pathname.replace(/\/+$/,'');return Response.redirect(url.toString(),308)}
    if (url.pathname.startsWith('/api/store/')) { const response=await storeApi(request, env); response.headers.set('Cache-Control','no-store'); return response; }
    if (['/login','/register','/auth/login'].includes(url.pathname)) return Response.redirect(url.origin+'/signin-with-chatgpt?return_to=%2Fadmin',302);
    if (url.pathname==='/'||['/shop','/videos','/saved','/compare','/checkout','/about','/contact','/faq','/reviews','/quiz'].includes(url.pathname)||url.pathname.startsWith('/product/')) return new Response(marketplaceHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    if (!url.pathname.startsWith('/marketplace/') && !url.pathname.startsWith('/videos/') && !url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/@') && !url.pathname.startsWith('/node_modules/') && !url.pathname.startsWith('/src/') && !url.pathname.startsWith('/__') && !url.pathname.startsWith('/signin-') && !url.pathname.startsWith('/signout-') && !url.pathname.startsWith('/callback')) return new Response(url.pathname==='/admin'||url.pathname.startsWith('/admin/')||['/forgot-password','/reset-password'].includes(url.pathname)?storefrontHtml:marketplaceHtml,{status:url.pathname==='/admin'||url.pathname.startsWith('/admin/')||['/forgot-password','/reset-password'].includes(url.pathname)?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
