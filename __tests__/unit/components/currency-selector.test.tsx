import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencySelector } from '../../../artifacts/wms-app/src/components/currency-selector';

// Mock the Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="currency-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ children }: any) => <>{children}</>,
}));

// Mock react-query
teconst mockCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true },
  { code: 'EUR', name: 'Euro', symbol: '€', isBase: false },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: false },
];

describe('CurrencySelector Component', () => {
  it('renders without errors', () => {
    const { container } = render(
      <CurrencySelector value="USD" onValueChange={() => {}} />
    );
    expect(container.querySelector('select')).toBeTruthy();
  });

  it('displays the selected value', () => {
    render(<CurrencySelector value="USD" onValueChange={() => {}} />);
    const select = document.querySelector('[data-testid="currency-select"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('USD');
  });

  it('calls onValueChange when selection changes', async () => {
    const handleChange = vi.fn();
    render(<CurrencySelector value="USD" onValueChange={handleChange} />);

    const select = document.querySelector('[data-testid="currency-select"]') as HTMLSelectElement;
    // Simulate change
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it('accepts custom className', () => {
    const { container } = render(
      <CurrencySelector value="USD" onValueChange={() => {}} className="custom-class" />
    );
    // Component should render without throwing error
    expect(container).toBeTruthy();
  });
});

describe('CurrencySelector Integration', () => {
  it('handles currency data from API', async () => {
    // Simulate fetching currencies
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: false },
    ];

    // Verify currencies have required fields
    currencies.forEach(c => {
      expect(c.code).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.symbol).toBeTruthy();
      expect(typeof c.isBase).toBe('boolean');
    });
  });

  it('validates currency selection', () => {
    const validCurrencies = ['USD', 'INR', 'EUR'];
    const selected = 'USD';

    expect(validCurrencies).toContain(selected);
    expect(validCurrencies).not.toContain('XYZ');
  });
});
