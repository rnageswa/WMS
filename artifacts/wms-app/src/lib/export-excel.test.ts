import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToExcel, fetchAndExportExcel } from './export-excel';
import * as XLSX from 'xlsx';

// Mock the xlsx library
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('export-excel Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToExcel', () => {
    it('should do nothing if data array is empty', () => {
      exportToExcel([], 'test-file');
      expect(XLSX.utils.json_to_sheet).not.toHaveBeenCalled();
      expect(XLSX.writeFile).not.toHaveBeenCalled();
    });

    it('should generate a worksheet and workbook from data', () => {
      const data = [
        { id: 1, name: 'Item A', qty: 10 },
        { id: 2, name: 'Item B', qty: 5 },
      ];
      exportToExcel(data, 'inventory-report');

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), 'inventory-report.xlsx');
    });

    it('should auto-size columns correctly', () => {
      const data = [
        { name: 'Very Long Name', description: 'Short' },
      ];
      exportToExcel(data, 'report');
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchAndExportExcel', () => {
    it('should fetch data and call exportToExcel successfully', async () => {
      const mockData = [
        { id: 1, status: 'ordered' }
      ];
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await fetchAndExportExcel('/api/orders', 'orders-list');

      expect(global.fetch).toHaveBeenCalledWith('/api/orders', { credentials: "include" });
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchAndExportExcel('http://api.test/data')).rejects.toThrow('Export failed: 500');
    });

    it('should extract items from a nested API response', async () => {
      const nestedResponse = { items: [{ id: 1 }, { id: 2 }] };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => nestedResponse,
      });

      await fetchAndExportExcel('/api/data');
      
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(nestedResponse.items);
    });
  });
});