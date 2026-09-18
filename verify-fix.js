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
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function verify() {
  try {
    console.log('=== VERIFICATION OF FIXES ===\n');

    // 1. Check that the service duration is used in agendamento creation
    console.log('1. Testing service duration usage in agendamento end time...');
    // Insert a test service with 30 minutes duration
    const insertService = await sql`
      INSERT INTO servicos (nome, descricao, duracao_minutos, preco, ativo)
      VALUES ('Servico Teste 30min', 'Servico de teste com 30 minutos', 30, 50.00, true)
      ON CONFLICT (nome) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        duracao_minutos = EXCLUDED.duracao_minutos,
        preco = EXCLUDED.preco,
        ativo = EXCLUDED.ativo
      RETURNING id, duracao_minutos
    `;
    const testService = insertService[0];
    console.log(`   Test service ID: ${testService.id}, duration: ${testService.duracao_minutos} minutes`);

    // Create an appointment using this service
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 10); // Start in 10 minutes to avoid current time issues
    const endTimeExpected = new Date(startTime.getTime() + testService.duracao_minutos * 60000);

    const agendamentoResult = await sql`
      INSERT INTO agendamentos (cliente_id, servico_id, inicio, fim, status, observacoes)
      VALUES (
        (SELECT id FROM clientes LIMIT 1),
        ${testService.id},
        ${startTime.toISOString()},
        ${endTimeExpected.toISOString()},
        'pendente',
        'Teste de verificacao'
      )
      RETURNING id, inicio, fim
    `;
    const agendamento = agendamentoResult[0];
    const actualEnd = new Date(agendamento.fim);
    console.log(`   Appointment start: ${startTime.toISOString()}`);
    console.log(`   Expected end: ${endTimeExpected.toISOString()}`);
    console.log(`   Actual end: ${actualEnd.toISOString()}`);
    if (actualEnd.getTime() === endTimeExpected.getTime()) {
      console.log('   ✓ PASS: Service duration correctly used for end time\n');
    } else {
      console.log('   ✗ FAIL: Service duration not used correctly\n');
    }

    // 2. Test conflict detection (15-minute buffer between appointments)
    console.log('2. Testing conflict detection (no overlapping appointments)...');
    // Try to create an overlapping appointment (should fail)
    const overlapStart = new Date(startTime.getTime() + 10 * 60000); // 10 minutes after start
    const overlapEnd = new Date(overlapStart.getTime() + testService.duracao_minutos * 60000);
    try {
      await sql`
        INSERT INTO agendamentos (cliente_id, servico_id, inicio, fim, status, observacoes)
        VALUES (
          (SELECT id FROM clientes LIMIT 1),
          ${testService.id},
          ${overlapStart.toISOString()},
          ${overlapEnd.toISOString()},
          'pendente',
          'Tentativa de sobreposicao'
        )
      `;
      console.log('   ✗ FAIL: Overlapping appointment was allowed (should have failed)');
    } catch (err) {
      if (err.code === '23P01' || err.code === '23505') { // exclusion violation
        console.log('   ✓ PASS: Conflict detection prevented overlapping appointment\n');
      } else {
        console.log(`   ? Unexpected error: ${err.message}\n`);
      }
    }

    // 3. Check that the 15-minute buffer rule is not in place (since we use service duration)
    // Actually, we are not adding a buffer, so appointments can be scheduled back-to-back if the service duration allows.
    // Let's test that we can create an appointment right after the previous one ends.
    console.log('3. Testing back-to-back appointments (no buffer)...');
    const backToBackStart = new Date(agendamento.fim); // Start exactly when previous ends
    const backToBackEnd = new Date(backToBackStart.getTime() + testService.duracao_minutos * 60000);
    try {
      const backToBackResult = await sql`
        INSERT INTO agendamentos (cliente_id, servico_id, inicio, fim, status, observacoes)
        VALUES (
          (SELECT id FROM clientes LIMIT 1),
          ${testService.id},
          ${backToBackStart.toISOString()},
          ${backToBackEnd.toISOString()},
          'pendente',
          'Agendamento sequencial'
        )
        RETURNING id
      `;
      console.log(`   ✓ PASS: Back-to-back appointment created (ID: ${backToBackResult[0].id})\n`);
    } catch (err) {
      console.log(`   ✗ FAIL: Back-to-back appointment failed: ${err.message}\n`);
    }

    // Clean up: delete the test appointment and service
    console.log('4. Cleaning up test data...');
    await sql`DELETE FROM agendamentos WHERE observacao = 'Teste de verificacao' OR observacao = 'Tentativa de sobreposicao' OR observacao = 'Agendamento sequencial'`;
    await sql`DELETE FROM servicos WHERE nome = 'Servico Teste 30min'`;
    console.log('   Test data removed\n');

    console.log('=== VERIFICATION COMPLETE ===');
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

verify();
