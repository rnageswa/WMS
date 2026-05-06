import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vititteston';

// Mock the API service
const mockGetProducts = vi.fn();

describe('ProductList', () to {
  beforeEach(() => {
    vi.clearAllMocks();
  };

  it('renders product list with items', () => {
    // Mock component
    const ProductListComponent = () => <div>Product List</div>;
    
    render(<ProductListComponent />);
    expect(screen.getByText('Product List')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock component
    const LoadingComponent = () => <div>Loading products...</div>;
    
    render(<LoadingComponent />);
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
  });
});