// Test script to verify API functions
const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env.local');
const envBuffer = fs.readFileSync(envPath, 'utf8');
const lines = envBuffer.split('\n');
lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1];
    let value = match[2];
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

// Mock req/res objects for testing
function createMockReq(method, body = {}) {
  return {
    method,
    body
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

// Test agendamentos API
async function testAgendamentosAPI() {
  console.log('\n=== TESTING AGENDAMENTOS API ===');
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Import the handler
    const handler = require('./api/agendamentos.js');
    
    // Test GET (should return API info)
    const getReq = createMockReq('GET');
    const getRes = createMockRes();
    await handler(getReq, getRes);
    console.log('GET /api/agendamentos:', getRes.jsonData);
    
    // Test POST with invalid data (should return validation error)
    const postReqInvalid = createMockReq('POST', {});
    const postResInvalid = createMockRes();
    await handler(postReqInvalid, postResInvalid);
    console.log('POST /api/agendamentos (invalid):', postResInvalid.jsonData);
    
    // Test POST with valid data (should try to create appointment)
    // First, let's check what services exist
    const services = await sql`SELECT id, nome, duracao_minutos, preco FROM servicos WHERE ativo = true LIMIT 1`;
    if (services.length > 0) {
      const service = services[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
      
      const postReqValid = createMockReq('POST', {
        nome: 'Cliente Teste',
        telefone: '(11) 99999-9999',
        email: 'teste@exemplo.com',
        servico: service.nome,
        inicio: tomorrow.toISOString(),
        observacoes: 'Teste automatizado'
      });
      const postResValid = createMockRes();
      await handler(postReqValid, postResValid);
      console.log('POST /api/agendamentos (valid):', postResValid.jsonData);
    }
    
  } catch (error) {
    console.error('Error testing agendamentos API:', error.message);
  }
}

// Test pagamentos API
async function testPagamentosAPI() {
  console.log('\n=== TESTING PAGAMENTOS API ===');
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Import the handler
    const handler = require('./api/pagamentos.js');
    
    // Test GET (should return gateway info)
    const getReq = createMockReq('GET');
    const getRes = createMockRes();
    await handler(getReq, getRes);
    console.log('GET /api/pagamentos:', getRes.jsonData);
    
    // Test POST with invalid data (should return validation error)
    const postReqInvalid = createMockReq('POST', {});
    const postResInvalid = createMockRes();
    await handler(postReqInvalid, postResInvalid);
    console.log('POST /api/pagamentos (invalid):', postResInvalid.jsonData);
    
  } catch (error) {
    console.error('Error testing pagamentos API:', error.message);
  }
}

// Test webhook API
async function testWebhookAPI() {
  console.log('\n=== TESTING WEBHOOK API ===');
  try {
    const handler = require('./api/webhooks/mercado-pago.js');
    
    // Test GET (should return method not allowed)
    const getReq = createMockReq('GET');
    const getRes = createMockRes();
    await handler(getReq, getRes);
    console.log('GET /api/webhooks/mercado-pago:', getRes.jsonData);
    
    // Test POST with invalid data (should return unauthorized or bad request)
    const postReqInvalid = createMockReq('POST', {});
    const postResInvalid = createMockRes();
    await handler(postReqInvalid, postResInvalid);
    console.log('POST /api/webhooks/mercado-pago (invalid):', postResInvalid.jsonData);
    
  } catch (error) {
    console.error('Error testing webhook API:', error.message);
  }
}

// Run tests
async function runTests() {
  await testAgendamentosAPI();
  await testPagamentosAPI();
  await testWebhookAPI();
  console.log('\n=== TESTS COMPLETED ===');
}

runTests().catch(console.error);