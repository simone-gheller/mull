import { FONTS } from '@vextis/ui';
import { MethodBadge } from './MethodBadge.jsx';
import { SchemaTable } from './SchemaTable.jsx';
import { CommandBlock } from '../content/CommandBlock.jsx';
import { OutputBlock } from '../content/OutputBlock.jsx';
import {
  operationLabel,
  parameterRows,
  schemaProperties,
  exampleFromSchema,
  primaryResponseSchema,
  buildCurl,
} from '../../lib/openapi.js';

function Section({ T, title, children }) {
  return (
    <div style={{ marginBottom: '26px' }}>
      <h2 style={{ fontFamily: FONTS.display, fontSize: '15px', fontWeight: 600, color: T.textPrimary, marginBottom: '10px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// Left column: what the operation needs and returns (params, request/response schema).
// Right column: how to actually call it (curl example + a generated example response) — kept
// side by side so you can read the shape and copy a working call without scrolling back and forth.
export function OperationDetail({ T, method, path, operation, serverUrl }) {
  const pathParams = parameterRows(operation.parameters, 'path');
  const queryParams = parameterRows(operation.parameters, 'query');
  const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
  const bodyRows = schemaProperties(bodySchema);
  const { code: responseCode, schema: responseSchema } = primaryResponseSchema(operation);
  const responseRows = schemaProperties(responseSchema);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <MethodBadge T={T} method={method} size="lg" />
        <code style={{ fontFamily: FONTS.mono, fontSize: '14px', color: T.textMuted, wordBreak: 'break-all' }}>{path}</code>
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: '26px', letterSpacing: '-0.02em', color: T.textPrimary, marginBottom: '8px' }}>
        {operationLabel(method, path)}
      </h1>
      {operation.description && (
        <p style={{ fontFamily: FONTS.display, fontSize: '14px', color: T.textSecondary, lineHeight: 1.7, marginBottom: '28px', maxWidth: '640px' }}>
          {operation.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '40px', alignItems: 'start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          {pathParams.length > 0 && (
            <Section T={T} title="Path parameters">
              <SchemaTable T={T} rows={pathParams} />
            </Section>
          )}

          {queryParams.length > 0 && (
            <Section T={T} title="Query parameters">
              <SchemaTable T={T} rows={queryParams} />
            </Section>
          )}

          {bodyRows.length > 0 && (
            <Section T={T} title="Request body">
              <SchemaTable T={T} rows={bodyRows} />
            </Section>
          )}

          {responseRows.length > 0 && (
            <Section T={T} title={`Response body (${responseCode})`}>
              <SchemaTable T={T} rows={responseRows} />
            </Section>
          )}

          {pathParams.length === 0 && queryParams.length === 0 && bodyRows.length === 0 && responseRows.length === 0 && (
            <p style={{ fontFamily: FONTS.display, fontSize: '13px', color: T.textMuted }}>
              No parameters, request body, or response body — see the example on the right.
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 360px', minWidth: '320px', position: 'sticky', top: '76px' }}>
          <Section T={T} title="Example request">
            <CommandBlock T={T} title="cURL" command={buildCurl({ serverUrl, method, path, operation })} />
          </Section>

          {responseSchema && (
            <Section T={T} title={`Example response (${responseCode})`}>
              <OutputBlock T={T}>{JSON.stringify(exampleFromSchema(responseSchema), null, 2)}</OutputBlock>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
