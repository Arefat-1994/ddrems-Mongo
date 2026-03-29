#!/usr/bin/env node

/**
 * Real Estate Agreement System - Integration Check
 * Verifies all components are properly integrated
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function checkDatabase() {
  log.section('DATABASE INTEGRATION CHECK');

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '',
      database: 'ddrems'
    });

    // Check agreement tables
    const [tables] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME LIKE 'agreement%'
    `);

    log.info(`Found ${tables.length} agreement-related tables`);

    const requiredTables = [
      'agreement_requests',
      'agreement_documents',
      'agreement_fields',
      'payment_receipts',
      'commission_tracking',
      'agreement_audit_log',
      'agreement_notifications'
    ];

    for (const table of requiredTables) {
      const exists = tables.some(t => t.TABLE_NAME === table);
      if (exists) {
        log.success(`Table: ${table}`);
      } else {
        log.error(`Table: ${table} - MISSING`);
      }
    }

    // Check user roles
    const [roles] = await conn.execute(`
      SELECT DISTINCT role FROM users
    `);

    log.info(`Found ${roles.length} user roles`);
    const requiredRoles = ['user', 'owner', 'property_admin', 'system_admin'];
    for (const role of requiredRoles) {
      const exists = roles.some(r => r.role === role.toLowerCase());
      if (exists) {
        log.success(`Role: ${role}`);
      } else {
        log.warning(`Role: ${role} - NOT FOUND`);
      }
    }

    // Check foreign keys
    const [fks] = await conn.execute(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_requests'
    `);

    log.info(`Found ${fks.length} foreign keys in agreement_requests`);
    for (const fk of fks) {
      log.success(`FK: ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}`);
    }

    conn.end();
    return true;
  } catch (error) {
    log.error(`Database check failed: ${error.message}`);
    return false;
  }
}

async function checkBackend() {
  log.section('BACKEND INTEGRATION CHECK');

  try {
    // Check if route file exists
    const routePath = path.join(__dirname, 'server/routes/real-estate-agreement.js');
    if (fs.existsSync(routePath)) {
      log.success('Backend route file exists');
      
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check for required endpoints
      const endpoints = [
        'POST /request',
        'GET /customer/:customerId',
        'POST /:agreementId/submit-payment',
        'GET /admin/pending',
        'POST /:agreementId/generate',
        'POST /:agreementId/forward-to-owner',
        'POST /:agreementId/verify-payment',
        'GET /owner/:ownerId',
        'POST /:agreementId/owner-response'
      ];

      for (const endpoint of endpoints) {
        if (content.includes(endpoint.split(' ')[1])) {
          log.success(`Endpoint: ${endpoint}`);
        } else {
          log.warning(`Endpoint: ${endpoint} - NOT FOUND`);
        }
      }
    } else {
      log.error('Backend route file not found');
      return false;
    }

    // Check if route is registered in server/index.js
    const indexPath = path.join(__dirname, 'server/index.js');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      if (indexContent.includes("require('./routes/real-estate-agreement')")) {
        log.success('Route registered in server/index.js');
      } else {
        log.error('Route NOT registered in server/index.js');
        return false;
      }
    }

    return true;
  } catch (error) {
    log.error(`Backend check failed: ${error.message}`);
    return false;
  }
}

async function checkFrontend() {
  log.section('FRONTEND INTEGRATION CHECK');

  try {
    // Check if component file exists
    const componentPath = path.join(__dirname, 'client/src/components/RealEstateAgreementWorkflow.js');
    if (fs.existsSync(componentPath)) {
      log.success('Frontend component file exists');
      
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for required functions
      const functions = [
        'fetchAgreements',
        'handleRequestAgreement',
        'handleAction',
        'handleSubmitAction',
        'getStatusBadge'
      ];

      for (const func of functions) {
        if (content.includes(func)) {
          log.success(`Function: ${func}`);
        } else {
          log.warning(`Function: ${func} - NOT FOUND`);
        }
      }

      // Check for API endpoints
      const endpoints = [
        '/api/real-estate-agreement/customer/',
        '/api/real-estate-agreement/admin/pending',
        '/api/real-estate-agreement/owner/',
        '/api/real-estate-agreement/request',
        '/api/real-estate-agreement/generate',
        '/api/real-estate-agreement/forward-to-owner',
        '/api/real-estate-agreement/submit-payment',
        '/api/real-estate-agreement/verify-payment',
        '/api/real-estate-agreement/owner-response'
      ];

      for (const endpoint of endpoints) {
        if (content.includes(endpoint)) {
          log.success(`API Call: ${endpoint}`);
        } else {
          log.warning(`API Call: ${endpoint} - NOT FOUND`);
        }
      }
    } else {
      log.error('Frontend component file not found');
      return false;
    }

    // Check if CSS file exists
    const cssPath = path.join(__dirname, 'client/src/components/RealEstateAgreementWorkflow.css');
    if (fs.existsSync(cssPath)) {
      log.success('Frontend CSS file exists');
    } else {
      log.warning('Frontend CSS file not found');
    }

    return true;
  } catch (error) {
    log.error(`Frontend check failed: ${error.message}`);
    return false;
  }
}

async function checkDocumentation() {
  log.section('DOCUMENTATION CHECK');

  const docs = [
    'REAL_ESTATE_AGREEMENT_SYSTEM_COMPLETE.md',
    'REAL_ESTATE_AGREEMENT_QUICK_START.md',
    'REAL_ESTATE_AGREEMENT_INTEGRATION_GUIDE.md',
    'REAL_ESTATE_AGREEMENT_TESTING_GUIDE.md',
    'REAL_ESTATE_AGREEMENT_DEPLOYMENT_CHECKLIST.md',
    'REAL_ESTATE_AGREEMENT_IMPLEMENTATION_SUMMARY.md',
    'REAL_ESTATE_AGREEMENT_INTEGRATION_VERIFICATION.md'
  ];

  for (const doc of docs) {
    const docPath = path.join(__dirname, doc);
    if (fs.existsSync(docPath)) {
      const size = fs.statSync(docPath).size;
      log.success(`Documentation: ${doc} (${(size / 1024).toFixed(1)} KB)`);
    } else {
      log.warning(`Documentation: ${doc} - NOT FOUND`);
    }
  }

  return true;
}

async function checkIntegration() {
  log.section('INTEGRATION POINTS CHECK');

  try {
    // Check if component is imported in dashboards
    const dashboards = [
      'client/src/components/CustomerDashboardEnhanced.js',
      'client/src/components/OwnerDashboardEnhanced.js',
      'client/src/components/PropertyAdminDashboard.js',
      'client/src/components/SystemAdminDashboard.js'
    ];

    for (const dashboard of dashboards) {
      const dashPath = path.join(__dirname, dashboard);
      if (fs.existsSync(dashPath)) {
        const content = fs.readFileSync(dashPath, 'utf8');
        if (content.includes('RealEstateAgreementWorkflow')) {
          log.success(`Component integrated in: ${path.basename(dashboard)}`);
        } else {
          log.warning(`Component NOT integrated in: ${path.basename(dashboard)}`);
        }
      }
    }

    // Check if component is in Sidebar
    const sidebarPath = path.join(__dirname, 'client/src/components/Sidebar.js');
    if (fs.existsSync(sidebarPath)) {
      const content = fs.readFileSync(sidebarPath, 'utf8');
      if (content.includes('real-estate-agreement') || content.includes('Real Estate Agreement')) {
        log.success('Component in Sidebar navigation');
      } else {
        log.warning('Component NOT in Sidebar navigation');
      }
    }

    return true;
  } catch (error) {
    log.error(`Integration check failed: ${error.message}`);
    return false;
  }
}

async function generateReport() {
  log.section('SYSTEM INTEGRATION CHECK REPORT');

  const results = {
    database: await checkDatabase(),
    backend: await checkBackend(),
    frontend: await checkFrontend(),
    documentation: await checkDocumentation(),
    integration: await checkIntegration()
  };

  log.section('SUMMARY');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`\nPassed: ${passed}/${total}`);

  if (passed === total) {
    log.success('All checks passed! System is ready for deployment.');
  } else {
    log.warning(`${total - passed} check(s) need attention.`);
  }

  console.log('\nDetailed Results:');
  for (const [check, result] of Object.entries(results)) {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${check.charAt(0).toUpperCase() + check.slice(1)}`);
  }

  console.log('\n' + colors.cyan + '═══════════════════════════════════════' + colors.reset);
}

// Run checks
generateReport().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
