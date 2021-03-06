/*!
 * Copyright 2019, OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Status, CanonicalCode, Span } from '@opentelemetry/types';
import {
  RequestOptions,
  IncomingMessage,
  ClientRequest,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
} from 'http';
import { IgnoreMatcher, Err, ParsedRequestOptions } from './types';
import { AttributeNames } from './enums/AttributeNames';
import * as url from 'url';

export const OT_REQUEST_HEADER = 'x-opentelemetry-outgoing-request';
/**
 * Get an absolute url
 */
export const getAbsoluteUrl = (
  requestUrl: ParsedRequestOptions | null,
  headers: IncomingHttpHeaders | OutgoingHttpHeaders,
  fallbackProtocol = 'http:'
): string => {
  const reqUrlObject = requestUrl || {};
  const protocol = reqUrlObject.protocol || fallbackProtocol;
  const port = (reqUrlObject.port || '').toString();
  const path = reqUrlObject.path || '/';
  let host =
    reqUrlObject.host || reqUrlObject.hostname || headers.host || 'localhost';

  // if there is no port in host and there is a port
  // it should be displayed if it's not 80 and 443 (default ports)
  if (
    (host as string).indexOf(':') === -1 &&
    port &&
    port !== '80' &&
    port !== '443'
  ) {
    host += `:${port}`;
  }

  return `${protocol}//${host}${path}`;
};
/**
 * Parse status code from HTTP response.
 */
export const parseResponseStatus = (
  statusCode: number
): Omit<Status, 'message'> => {
  if (statusCode < 200 || statusCode > 504) {
    return { code: CanonicalCode.UNKNOWN };
  } else if (statusCode >= 200 && statusCode < 400) {
    return { code: CanonicalCode.OK };
  } else {
    switch (statusCode) {
      case 400:
        return { code: CanonicalCode.INVALID_ARGUMENT };
      case 504:
        return { code: CanonicalCode.DEADLINE_EXCEEDED };
      case 404:
        return { code: CanonicalCode.NOT_FOUND };
      case 403:
        return { code: CanonicalCode.PERMISSION_DENIED };
      case 401:
        return { code: CanonicalCode.UNAUTHENTICATED };
      case 429:
        return { code: CanonicalCode.RESOURCE_EXHAUSTED };
      case 501:
        return { code: CanonicalCode.UNIMPLEMENTED };
      case 503:
        return { code: CanonicalCode.UNAVAILABLE };
      default:
        return { code: CanonicalCode.UNKNOWN };
    }
  }
};

/**
 * Returns whether the Expect header is on the given options object.
 * @param options Options for http.request.
 */
export const hasExpectHeader = (options: RequestOptions | url.URL): boolean => {
  if (typeof (options as RequestOptions).headers !== 'object') {
    return false;
  }

  const keys = Object.keys((options as RequestOptions).headers!);
  return !!keys.find(key => key.toLowerCase() === 'expect');
};

/**
 * Check whether the given obj match pattern
 * @param constant e.g URL of request
 * @param obj obj to inspect
 * @param pattern Match pattern
 */
export const satisfiesPattern = <T>(
  constant: string,
  pattern: IgnoreMatcher
): boolean => {
  if (typeof pattern === 'string') {
    return pattern === constant;
  } else if (pattern instanceof RegExp) {
    return pattern.test(constant);
  } else if (typeof pattern === 'function') {
    return pattern(constant);
  } else {
    throw new TypeError('Pattern is in unsupported datatype');
  }
};

/**
 * Check whether the given request is ignored by configuration
 * It will not re-throw exceptions from `list` provided by the client
 * @param constant e.g URL of request
 * @param [list] List of ignore patterns
 * @param [onException] callback for doing something when an exception has
 *     occurred
 */
export const isIgnored = (
  constant: string,
  list?: IgnoreMatcher[],
  onException?: (error: Error) => void
): boolean => {
  if (!list) {
    // No ignored urls - trace everything
    return false;
  }
  // Try/catch outside the loop for failing fast
  try {
    for (const pattern of list) {
      if (satisfiesPattern(constant, pattern)) {
        return true;
      }
    }
  } catch (e) {
    if (onException) {
      onException(e);
    }
  }

  return false;
};

/**
 * Sets the span with the error passed in params
 * @param {Span} span the span that need to be set
 * @param {Error} error error that will be set to span
 * @param {(IncomingMessage | ClientRequest)} [obj] used for enriching the status by checking the statusCode.
 */
export const setSpanWithError = (
  span: Span,
  error: Err,
  obj?: IncomingMessage | ClientRequest
) => {
  const message = error.message;

  span.setAttributes({
    [AttributeNames.HTTP_ERROR_NAME]: error.name,
    [AttributeNames.HTTP_ERROR_MESSAGE]: message,
  });

  if (!obj) {
    span.setStatus({ code: CanonicalCode.UNKNOWN, message });
    return;
  }

  let status: Status;
  if ((obj as IncomingMessage).statusCode) {
    status = parseResponseStatus((obj as IncomingMessage).statusCode!);
  } else if ((obj as ClientRequest).aborted) {
    status = { code: CanonicalCode.ABORTED };
  } else {
    status = { code: CanonicalCode.UNKNOWN };
  }

  status.message = message;

  span.setStatus(status);
};

/**
 * Makes sure options is an url object
 * return an object with default value and parsed options
 * @param options original options for the request
 * @param [extraOptions] additional options for the request
 */
export const getRequestInfo = (
  options: url.URL | RequestOptions | string,
  extraOptions?: RequestOptions
) => {
  let pathname = '/';
  let origin = '';
  let optionsParsed: RequestOptions;
  if (typeof options === 'string') {
    optionsParsed = url.parse(options);
    pathname = (optionsParsed as url.UrlWithStringQuery).pathname || '/';
    origin = `${optionsParsed.protocol || 'http:'}//${optionsParsed.host}`;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else if (options instanceof url.URL) {
    optionsParsed = {
      protocol: options.protocol,
      hostname:
        typeof options.hostname === 'string' && options.hostname.startsWith('[')
          ? options.hostname.slice(1, -1)
          : options.hostname,
      path: `${options.pathname || ''}${options.search || ''}`,
    };
    if (options.port !== '') {
      optionsParsed.port = Number(options.port);
    }
    if (options.username || options.password) {
      optionsParsed.auth = `${options.username}:${options.password}`;
    }
    pathname = options.pathname;
    origin = options.origin;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else {
    optionsParsed = Object.assign({}, options);
    pathname = (options as url.URL).pathname;
    if (!pathname && optionsParsed.path) {
      pathname = url.parse(optionsParsed.path).pathname || '/';
    }
    origin = `${optionsParsed.protocol || 'http:'}//${optionsParsed.host ||
      `${optionsParsed.hostname}:${optionsParsed.port}`}`;
  }

  if (hasExpectHeader(optionsParsed)) {
    optionsParsed.headers = Object.assign({}, optionsParsed.headers);
  } else if (!optionsParsed.headers) {
    optionsParsed.headers = {};
  }
  // some packages return method in lowercase..
  // ensure upperCase for consistency
  const method = optionsParsed.method
    ? optionsParsed.method.toUpperCase()
    : 'GET';

  return { origin, pathname, method, optionsParsed };
};

/**
 * Makes sure options is of type string or object
 * @param options for the request
 */
export const isValidOptionsType = (options: unknown): boolean => {
  if (!options) {
    return false;
  }

  const type = typeof options;
  return type === 'string' || (type === 'object' && !Array.isArray(options));
};

/**
 * Check whether the given request should be ignored
 * Use case: Typically, exporter `SpanExporter` can use http module to send spans.
 * This will also generate spans (from the http-plugin) that will be sended through the exporter
 * and here we have loop.
 * @param {RequestOptions} options
 */
export const isOpenTelemetryRequest = (options: RequestOptions) => {
  return !!(options && options.headers && options.headers[OT_REQUEST_HEADER]);
};
