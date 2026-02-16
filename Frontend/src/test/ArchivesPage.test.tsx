import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ArchivesPage } from '../pages/ArchivesPage';

// Create mock archives data
const mockArchives = [
  {
    date: '2024-01-15',
    url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-15.zip',
    size: 5242880, // 5 MB
    updated: '2024-01-15T10:00:00+00:00'
  },
  {
    date: '2024-01-14',
    url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-14.zip',
    size: 5120000, // ~4.88 MB
    updated: '2024-01-14T10:00:00+00:00'
  },
  {
    date: '2024-01-13',
    url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-13.zip',
    size: 5300000, // ~5.05 MB
    updated: '2024-01-13T10:00:00+00:00'
  },
  {
    date: '2024-01-10',
    url: 'https://cijene.searxngmate.tk/v0/archive/2024-01-10.zip',
    size: 5100000, // ~4.86 MB
    updated: '2024-01-10T10:00:00+00:00'
  }
];

// Setup MSW server
const server = setupServer(
  http.get('https://cijene.searxngmate.tk/v0/list', () => {
    return HttpResponse.json({ archives: mockArchives });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper function to render the component
const renderArchivesPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ArchivesPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ArchivesPage', () => {
  it('renders loading state initially', () => {
    renderArchivesPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays archive information cards', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Check for info cards
    expect(screen.getByText('Total Archives')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // 4 archives
    expect(screen.getByText('Total Size')).toBeInTheDocument();
    expect(screen.getByText('Latest Update')).toBeInTheDocument();
  });

  it('displays all archives in the list', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText(/Archive for/)).toBeInTheDocument();
    });

    // Check that all 4 archives are displayed
    const archiveElements = screen.getAllByText(/Archive for/);
    expect(archiveElements).toHaveLength(4);
  });

  it('displays date filter controls', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Filter by Date Range')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('From Date')).toBeInTheDocument();
    expect(screen.getByLabelText('To Date')).toBeInTheDocument();
  });

  it('filters archives by date range', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Set date filter from 2024-01-13 to 2024-01-14
    const fromDateInput = screen.getByLabelText('From Date');
    const toDateInput = screen.getByLabelText('To Date');

    await user.clear(fromDateInput);
    await user.type(fromDateInput, '2024-01-13');
    await user.clear(toDateInput);
    await user.type(toDateInput, '2024-01-14');

    // Should show only 2 archives (2024-01-13 and 2024-01-14)
    await waitFor(() => {
      const archiveElements = screen.getAllByText(/Archive for/);
      expect(archiveElements).toHaveLength(2);
    });
  });

  it('displays batch download controls', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Batch Download')).toBeInTheDocument();
    });

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Selected/ })).toBeInTheDocument();
  });

  it('allows selecting individual archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Find all select buttons (checkbox icons)
    const selectButtons = screen.getAllByRole('button', { name: /Select archive/ });
    expect(selectButtons.length).toBeGreaterThan(0);

    // Click first archive to select it
    await user.click(selectButtons[0]);

    // Batch download button should show (1) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download Selected \(1\)/ })).toBeInTheDocument();
    });
  });

  it('allows selecting all archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    // Batch download button should show (4) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download Selected \(4\)/ })).toBeInTheDocument();
    });

    // Select All button should be disabled
    expect(selectAllButton).toBeDisabled();
  });

  it('allows deselecting all archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // First select all
    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download Selected \(4\)/ })).toBeInTheDocument();
    });

    // Then deselect all
    const deselectAllButton = screen.getByText('Deselect All');
    await user.click(deselectAllButton);

    // Should show (0) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download Selected \(0\)/ })).toBeInTheDocument();
    });

    // Deselect All button should be disabled
    expect(deselectAllButton).toBeDisabled();
  });

  it('displays selected archive count and size', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Select all archives
    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    // Should display count and size
    await waitFor(() => {
      expect(screen.getByText(/4 archives selected/)).toBeInTheDocument();
    });
  });

  it('clears date filter when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Set a date filter
    const fromDateInput = screen.getByLabelText('From Date');
    await user.type(fromDateInput, '2024-01-14');

    // Clear filter button should appear
    await waitFor(() => {
      expect(screen.getByText('Clear Filter')).toBeInTheDocument();
    });

    // Click clear filter
    const clearButton = screen.getByText('Clear Filter');
    await user.click(clearButton);

    // Date input should be empty
    expect(fromDateInput).toHaveValue('');
  });

  it('has individual download buttons for each archive', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('Price Archives')).toBeInTheDocument();
    });

    // Should have 4 individual download buttons (one for each archive)
    const downloadButtons = screen.getAllByRole('button', { name: /Download ZIP/ });
    expect(downloadButtons).toHaveLength(4);
  });
});
