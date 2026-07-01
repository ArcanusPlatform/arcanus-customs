import fs from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import XLSX from 'xlsx';
import { HMRCDeclarationInformationService } from '../backend/src/services/hmrc-info/declaration-service.js';

const baseUrl = process.env.CDS_API_BASE_URL || 'http://localhost:3005';
const mrn = '23GB123456789ABCDEF';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }

  return body;
}

async function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function registerTestUser() {
  const timestamp = Date.now();
  const email = `cds.lifecycle.${timestamp}@example.test`;
  const password = 'LifecycleTest123!';

  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: `CDS Lifecycle ${timestamp}`,
      first_name: 'CDS',
      last_name: 'Tester',
      email,
      password
    })
  });
}

async function uploadCsvFixtures(token) {
  const odsHeaderPath = '/tmp/sample-import-header.ods';
  const headerWorkbook = XLSX.utils.book_new();
  const csvWorkbook = XLSX.read(await fs.readFile('tests/fixtures/sample-import-header.csv'), { type: 'buffer' });
  const csvSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
  const headerRows = XLSX.utils.sheet_to_json(csvSheet, { header: 1 });
  XLSX.utils.book_append_sheet(headerWorkbook, XLSX.utils.aoa_to_sheet(headerRows), 'Header');
  XLSX.writeFile(headerWorkbook, odsHeaderPath, { bookType: 'ods' });

  const formData = new FormData();
  formData.append('header', await openAsBlob(odsHeaderPath, { type: 'application/vnd.oasis.opendocument.spreadsheet' }), 'sample-import-header.ods');
  formData.append('items', await openAsBlob('tests/fixtures/sample-import-items.csv', { type: 'text/csv' }), 'sample-import-items.csv');
  formData.append('tax', await openAsBlob('tests/fixtures/sample-import-tax.csv', { type: 'text/csv' }), 'sample-import-tax.csv');

  return request('/cds/import', {
    method: 'POST',
    headers: await authHeaders(token),
    body: formData
  });
}

async function testInformationServiceMapper() {
  const xml = await fs.readFile('tests/fixtures/sample-hmrc-notification.xml', 'utf8');
  const service = new HMRCDeclarationInformationService('test-user', {
    hmrcClient: {
      request: async () => xml
    },
    informationEndpoint: '/customs/declarations-information'
  });

  const declaration = await service.fetchDeclarationByMrn(mrn);
  if (declaration.declaration_source !== 'hmrc_information_api') {
    throw new Error(`Expected hmrc_information_api, got ${declaration.declaration_source}`);
  }
  if (declaration.soe_code !== 'SOE01' || declaration.roe_code !== 'ROE02') {
    throw new Error(`Expected SOE/ROE codes, got ${declaration.soe_code}/${declaration.roe_code}`);
  }

  return declaration;
}

async function submitHmrcEvent(token) {
  const xml = await fs.readFile('tests/fixtures/sample-hmrc-notification.xml', 'utf8');
  return request('/cds/hmrc/events', {
    method: 'POST',
    headers: {
      ...(await authHeaders(token)),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ payload: xml })
  });
}

async function main() {
  const registration = await registerTestUser();
  const token = registration.token;

  const batch = await uploadCsvFixtures(token);
  if (batch.batch.declarations !== 1) {
    throw new Error(`Expected one CSV declaration, got ${batch.batch.declarations}`);
  }

  const imported = await request(`/cds/declarations?mrn=${encodeURIComponent(mrn)}`, {
    headers: await authHeaders(token)
  });
  const csvDeclaration = imported.declarations?.[0];
  if (!csvDeclaration) throw new Error('CSV declaration was not returned by list endpoint');
  if (csvDeclaration.declaration_source !== 'csv') {
    throw new Error(`Expected CSV declaration_source, got ${csvDeclaration.declaration_source}`);
  }

  const hmrcMapped = await testInformationServiceMapper();
  const eventResult = await submitHmrcEvent(token);
  if (!eventResult.event?.id) throw new Error('HMRC event endpoint did not return an event id');

  const detail = await request(`/cds/declarations/${csvDeclaration.id}`, {
    headers: await authHeaders(token)
  });
  if (detail.declaration_source !== 'hmrc_notification') {
    throw new Error(`Expected snapshot source hmrc_notification after event, got ${detail.declaration_source}`);
  }
  if (detail.soe_code !== 'SOE01' || detail.roe_code !== 'ROE02') {
    throw new Error(`Snapshot missing SOE/ROE codes: ${detail.soe_code}/${detail.roe_code}`);
  }

  const versions = await request(`/cds/declarations/${csvDeclaration.id}/versions`, {
    headers: await authHeaders(token)
  });
  if ((versions.versions || []).length < 2) {
    throw new Error(`Expected at least 2 versions, got ${(versions.versions || []).length}`);
  }

  const events = await request(`/cds/declarations/${csvDeclaration.id}/events`, {
    headers: await authHeaders(token)
  });
  if ((events.events || []).length < 1) {
    throw new Error('Expected at least one HMRC event');
  }

  console.log(JSON.stringify({
    ok: true,
    mrn,
    csv_source: csvDeclaration.declaration_source,
    mapped_source: hmrcMapped.declaration_source,
    snapshot_source_after_event: detail.declaration_source,
    soe_code: detail.soe_code,
    roe_code: detail.roe_code,
    versions: versions.versions.length,
    events: events.events.length,
    declaration_id: csvDeclaration.id
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
