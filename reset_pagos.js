const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'herreria.db');
const backupPath = path.join(
  __dirname,
  '..',
  `herreria.db.bak.reset-pagos.${new Date().toISOString().replace(/[:.]/g, '-')}`
);

if (!fs.existsSync(dbPath)) {
  console.error('No se encontro la base de datos:', dbPath);
  process.exit(1);
}

fs.copyFileSync(dbPath, backupPath);
console.log('Backup creado:', backupPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('DELETE FROM pagos', (err) => {
    if (err) {
      console.error('Error borrando pagos:', err.message);
      return;
    }
    console.log('Pagos eliminados.');
  });

  db.run("DELETE FROM sqlite_sequence WHERE name='pagos'", (err) => {
    if (err) {
      console.error('Error reseteando autoincrement:', err.message);
    } else {
      console.log('Autoincrement de pagos reseteado.');
    }
  });

  db.get('SELECT COUNT(*) AS total FROM pagos', (err, row) => {
    if (err) {
      console.error('Error contando pagos:', err.message);
      return;
    }
    console.log('Pagos totales ahora:', row.total);
  });
});

db.close((err) => {
  if (err) console.error('Error cerrando DB:', err.message);
  else console.log('Reset de pagos finalizado.');
});
