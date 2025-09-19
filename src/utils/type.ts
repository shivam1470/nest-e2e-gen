export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type TEndpoint = {
  endpoint: string;
  method: ApiMethod;
  path: string;
  payload?: () => Record<string, any>;
  extra?: {
    insertAfter: string;
    valueKey: string;
    payload: () => Record<string, any>;
  }[];
};

export type TApiModule = Record<string, TEndpoint>;
