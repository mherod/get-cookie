import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CliSqliteAdapter } from './CliSqliteAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

describe('CliSqliteAdapter', () => {
  const testDbPath = 'test_cli.db';
  let adapter: CliSqliteAdapter;

  beforeEach(async () => {
    await execAsync(`sqlite3 "${testDbPath}" "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)"`);
    await execAsync(`sqlite3 "${testDbPath}" "INSERT INTO test VALUES (1, 'Test 1', 100), (2, NULL, 200)"`);
  });

  afterEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should handle JSON output format', async () => {
    adapter = new CliSqliteAdapter({ file: testDbPath, json: true });
    const result = await adapter.query('SELECT * FROM test ORDER BY id');
    const rows = await result.all();

    expect(rows).toEqual([
      { id: 1, name: 'Test 1', value: 100 },
      { id: 2, name: null, value: 200 }
    ]);
  });

  it('should handle custom NULL values', async () => {
    adapter = new CliSqliteAdapter({
      file: testDbPath,
      nullValue: 'NULL_VALUE'
    });
    const result = await adapter.query('SELECT * FROM test WHERE id = 2');
    const rows = await result.all();

    expect(rows[0].column1).toBe('NULL_VALUE');
  });

  it('should handle custom separators', async () => {
    adapter = new CliSqliteAdapter({
      file: testDbPath,
      separator: ','
    });
    const result = await adapter.query('SELECT * FROM test ORDER BY id');
    const rows = await result.all();

    expect(rows).toHaveLength(2);
    expect(rows[0].column0).toBe('1');
    expect(rows[0].column1).toBe('Test 1');
  });

  it('should respect readonly flag', async () => {
    adapter = new CliSqliteAdapter({
      file: testDbPath,
      readOnly: true
    });

    const query = adapter.query('INSERT INTO test VALUES (3, "Test 3", 300)');
    await expect(query).rejects.toThrow();
  });
});