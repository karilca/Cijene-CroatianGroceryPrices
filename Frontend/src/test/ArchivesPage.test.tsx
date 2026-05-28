import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { ArchivesPage } from '../pages/ArchivesPage';
import { LanguageContext } from '../contexts/LanguageContext';
import type { TranslationKey } from '../utils/translations';
import { server } from './setup';

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

beforeEach(() => {
  server.use(
    http.get('*/v0/list', () => {
      return HttpResponse.json({ archives: mockArchives });
    })
  );
});

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
      <LanguageContext.Provider
        value={{
          language: 'en',
          setLanguage: () => undefined,
          t: (key: TranslationKey) => key || key,
        }}
      >
        <BrowserRouter>
          <ArchivesPage />
        </BrowserRouter>
      </LanguageContext.Provider>
    </QueryClientProvider>
  );
};

describe('ArchivesPage', () => {
  it('renders loading state initially', () => {
    const { container } = renderArchivesPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays archive information cards', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Check for info cards
    expect(screen.getByText('archives.info.total')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // 4 archives
    expect(screen.getByText('archives.info.size')).toBeInTheDocument();
    expect(screen.getByText('archives.info.latest')).toBeInTheDocument();
  });

  it('displays all archives in the list', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getAllByText(/archives\.item\.title/)).toHaveLength(4);
    });
  });

  it('displays date filter controls', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.filter.title')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('archives.filter.from')).toBeInTheDocument();
    expect(screen.getByLabelText('archives.filter.to')).toBeInTheDocument();
  });

  it('filters archives by date range', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Set date filter from 2024-01-13 to 2024-01-14
    const fromDateInput = screen.getByLabelText('archives.filter.from');
    const toDateInput = screen.getByLabelText('archives.filter.to');

    await user.clear(fromDateInput);
    await user.type(fromDateInput, '2024-01-13');
    await user.clear(toDateInput);
    await user.type(toDateInput, '2024-01-14');

    // Should show only 2 archives (2024-01-13 and 2024-01-14)
    await waitFor(() => {
      const archiveElements = screen.getAllByText(/archives\.item\.title/);
      expect(archiveElements).toHaveLength(2);
    });
  });

  it('displays batch download controls', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.batch.title')).toBeInTheDocument();
    });

    expect(screen.getByText('archives.select.all')).toBeInTheDocument();
    expect(screen.getByText('archives.select.none')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archives\.download\.selected/ })).toBeInTheDocument();
  });

  it('allows selecting individual archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Find all select buttons (checkbox icons)
    const selectButtons = screen.getAllByRole('button', { name: /archives\.select/ });
    expect(selectButtons.length).toBeGreaterThan(0);

    // Click first archive to select it
    await user.click(selectButtons[0]);

    // Batch download button should show (1) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archives\.download\.selected/ })).toBeInTheDocument();
    });
  });

  it('allows selecting all archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    const selectAllButton = screen.getByText('archives.select.all');
    await user.click(selectAllButton);

    // Batch download button should show (4) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archives\.download\.selected/ })).toBeInTheDocument();
    });

    // Select All button should be disabled
    expect(selectAllButton).toBeDisabled();
  });

  it('allows deselecting all archives', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // First select all
    const selectAllButton = screen.getByText('archives.select.all');
    await user.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archives\.download\.selected/ })).toBeInTheDocument();
    });

    // Then deselect all
    const deselectAllButton = screen.getByText('archives.select.none');
    await user.click(deselectAllButton);

    // Should show (0) selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archives\.download\.selected/ })).toBeInTheDocument();
    });

    // Deselect All button should be disabled
    expect(deselectAllButton).toBeDisabled();
  });

  it('displays selected archive count and size', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Select all archives
    const selectAllButton = screen.getByText('archives.select.all');
    await user.click(selectAllButton);

    // Should display count and size
    await waitFor(() => {
      expect(screen.getByText(/archives\.batch\.selected/)).toBeInTheDocument();
    });
  });

  it('clears date filter when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Set a date filter
    const fromDateInput = screen.getByLabelText('archives.filter.from');
    await user.type(fromDateInput, '2024-01-14');

    // Clear filter button should appear
    await waitFor(() => {
      expect(screen.getByText('archives.filter.clear')).toBeInTheDocument();
    });

    // Click clear filter
    const clearButton = screen.getByText('archives.filter.clear');
    await user.click(clearButton);

    // Date input should be empty
    expect(fromDateInput).toHaveValue('');
  });

  it('has individual download buttons for each archive', async () => {
    renderArchivesPage();
    
    await waitFor(() => {
      expect(screen.getByText('archives.title')).toBeInTheDocument();
    });

    // Should have 4 individual download buttons (one for each archive)
    const downloadButtons = screen.getAllByRole('button', { name: /archives\.item\.download/ });
    expect(downloadButtons).toHaveLength(4);
  });
});
