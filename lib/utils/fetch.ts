import type { RequestInfo, RequestInit, Response } from "node-fetch";

const _importDynamic = new Function("modulePath", "return import(modulePath)");

export const fetch = async (
  url: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  const { default: fetch } = await _importDynamic("node-fetch");
  return fetch(url, init);
};
