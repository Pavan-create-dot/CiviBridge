// Integration tests for the Admin & Department Triage Portal API
// Run with: node tests/triage.test.js

const http = require('http');
const assert = require('assert');
const app = require('../src/index');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

const { connectDB, disconnectDB } = require('../src/db/mongoClient');

async function runTests() {
  console.log('=== Admin Triage API Integration Test Suite ===');
  await connectDB();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@civibridge.org`;
    const citizenEmail = `citizen_${timestamp}@civibridge.org`;
    const password = 'TestPassword123!';

    // Test 1: Admin Provisioning (Secret Authentication)
    console.log('\n[Test 1] Provisioning admin account via POST /auth/register-admin...');
    const adminRegRes = await request('POST', '/auth/register-admin', {
      email: adminEmail,
      password,
      adminSecret: 'civibridge-admin-secret-2026',
    });
    assert.strictEqual(adminRegRes.status, 201, `Expected 201 Created, got ${adminRegRes.status}`);
    assert.strictEqual(adminRegRes.body.user.role, 'admin', 'Expected user role to be admin');
    console.log('  ✔ Admin provisioned successfully.');

    // Test 2: Admin Login
    console.log('\n[Test 2] Logging in as Admin via POST /auth/login...');
    const adminLoginRes = await request('POST', '/auth/login', {
      email: adminEmail,
      password,
    });
    assert.strictEqual(adminLoginRes.status, 200, `Expected 200 OK, got ${adminLoginRes.status}`);
    const adminToken = adminLoginRes.body.token;
    assert.ok(adminToken, 'Admin JWT token received');
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('  ✔ Admin login successful.');

    // Test 3: Citizen Registration & Login
    console.log('\n[Test 3] Registering and logging in citizen account...');
    const citizenRegRes = await request('POST', '/auth/register', {
      email: citizenEmail,
      password,
    });
    assert.strictEqual(
      citizenRegRes.status,
      201,
      `Expected 201 Created, got ${citizenRegRes.status}`
    );

    const citizenLoginRes = await request('POST', '/auth/login', {
      email: citizenEmail,
      password,
    });
    assert.strictEqual(
      citizenLoginRes.status,
      200,
      `Expected 200 OK, got ${citizenLoginRes.status}`
    );
    const citizenToken = citizenLoginRes.body.token;
    const citizenAuthHeader = { Authorization: `Bearer ${citizenToken}` };
    console.log('  ✔ Citizen account ready.');

    // Test 4: Role-based Access Control (Forbidden for Citizens)
    console.log('\n[Test 4] Verifying citizen access restriction (403 Forbidden)...');
    const forbidRes1 = await request('GET', '/triage/complaints', null, citizenAuthHeader);
    assert.strictEqual(
      forbidRes1.status,
      403,
      `Expected 403 Forbidden for citizen on /triage/complaints, got ${forbidRes1.status}`
    );

    const forbidRes2 = await request('GET', '/triage/stats', null, citizenAuthHeader);
    assert.strictEqual(
      forbidRes2.status,
      403,
      `Expected 403 Forbidden for citizen on /triage/stats, got ${forbidRes2.status}`
    );

    const forbidRes3 = await request('GET', '/triage/departments', null, citizenAuthHeader);
    assert.strictEqual(
      forbidRes3.status,
      403,
      `Expected 403 Forbidden for citizen on /triage/departments, got ${forbidRes3.status}`
    );
    console.log(
      '  ✔ RBAC restrictions verified — citizens are forbidden from triage portal endpoints.'
    );

    // Test 5: Submit a Grievance as Citizen
    console.log('\n[Test 5] Submitting a test grievance as citizen...');
    const complaintRes = await request(
      'POST',
      '/complaints',
      {
        rawText:
          'There is a large dangerous pothole near the main market square causing traffic hazards.',
        detectedLanguage: 'en',
      },
      citizenAuthHeader
    );
    assert.strictEqual(
      complaintRes.status,
      201,
      `Expected 201 Created, got ${complaintRes.status}`
    );
    const complaintId = complaintRes.body.complaint.id;
    assert.ok(complaintId, 'Complaint ID created');
    console.log(`  ✔ Grievance submitted (ID: ${complaintId}).`);

    // Test 6: Admin GET /triage/complaints
    console.log('\n[Test 6] Admin listing complaints via GET /triage/complaints...');
    const triageListRes = await request('GET', '/triage/complaints', null, adminAuthHeader);
    assert.strictEqual(triageListRes.status, 200, `Expected 200 OK, got ${triageListRes.status}`);
    assert.ok(Array.isArray(triageListRes.body.complaints), 'Complaints should be an array');
    assert.ok(triageListRes.body.pagination, 'Pagination object included');
    const targetComplaint = triageListRes.body.complaints.find((c) => c.id === complaintId);
    assert.ok(targetComplaint, 'Submitted complaint found in triage listing');
    console.log('  ✔ Admin complaint listing retrieved successfully.');

    // Test 7: Admin GET /triage/stats
    console.log('\n[Test 7] Admin fetching triage analytics via GET /triage/stats...');
    const statsRes = await request('GET', '/triage/stats', null, adminAuthHeader);
    assert.strictEqual(statsRes.status, 200, `Expected 200 OK, got ${statsRes.status}`);
    assert.ok(statsRes.body.stats, 'Stats object included');
    assert.ok(
      typeof statsRes.body.stats.totalComplaints === 'number',
      'totalComplaints is numeric'
    );
    console.log(
      `  ✔ Triage stats retrieved (Total Complaints: ${statsRes.body.stats.totalComplaints}).`
    );

    // Test 8: Admin GET /triage/departments
    console.log('\n[Test 8] Admin fetching departments list via GET /triage/departments...');
    const deptsRes = await request('GET', '/triage/departments', null, adminAuthHeader);
    assert.strictEqual(deptsRes.status, 200, `Expected 200 OK, got ${deptsRes.status}`);
    assert.ok(Array.isArray(deptsRes.body.departments), 'Departments is an array');
    console.log(
      `  ✔ Departments listed (${deptsRes.body.departments.length} departments available).`
    );

    // Test 9: Admin Triage Update (PATCH /triage/complaints/:id)
    console.log(
      `\n[Test 9] Admin triaging complaint ID ${complaintId} via PATCH /triage/complaints/${complaintId}...`
    );
    const updateRes = await request(
      'PATCH',
      `/triage/complaints/${complaintId}`,
      {
        assignedDepartment: 'Municipal Roads Department',
        priority: 'urgent',
        status: 'in_progress',
        adminNotes: 'Inspection team dispatched to main market square.',
      },
      adminAuthHeader
    );
    assert.strictEqual(updateRes.status, 200, `Expected 200 OK, got ${updateRes.status}`);
    const updated = updateRes.body.complaint;
    assert.strictEqual(
      updated.assignedDepartment,
      'Municipal Roads Department',
      'Assigned department updated'
    );
    assert.strictEqual(updated.priority, 'urgent', 'Priority updated to urgent');
    assert.strictEqual(updated.status, 'in_progress', 'Status updated to in_progress');
    assert.strictEqual(
      updated.adminNotes,
      'Inspection team dispatched to main market square.',
      'Admin notes saved'
    );
    console.log(
      '  ✔ Complaint triage updated successfully with department, priority, status, and notes.'
    );

    // Test 10: Filtering Complaints by Priority and Status
    console.log(
      '\n[Test 10] Admin filtering complaints by priority=urgent & status=in_progress...'
    );
    const filterRes = await request(
      'GET',
      '/triage/complaints?priority=urgent&status=in_progress',
      null,
      adminAuthHeader
    );
    assert.strictEqual(filterRes.status, 200, `Expected 200 OK, got ${filterRes.status}`);
    assert.ok(
      filterRes.body.complaints.some((c) => c.id === complaintId),
      'Filtered list contains the triaged complaint'
    );
    console.log('  ✔ Filtering complaints verified.');

    console.log('\n======================================================');
    console.log(' ALL PHASE 8 ADMIN TRIAGE API TESTS PASSED SUCCESSFULLY! ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runTests();
