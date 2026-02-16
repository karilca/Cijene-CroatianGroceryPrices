// Archives page component

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { archiveService } from '../services/archive.service';
import type { Archive } from '../types/api';
import { Download, FileText, Calendar, Database, Clock, CheckSquare, Square, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ITEMS_PER_PAGE = Number(import.meta.env.VITE_ARCHIVES_PER_PAGE) || 10;

export const ArchivesPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [selectedArchives, setSelectedArchives] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: archivesData, isLoading, error } = useQuery({
    queryKey: ['archives'],
    queryFn: () => archiveService.getArchives(),
  });

  const archives = useMemo(() => archivesData?.archives || [], [archivesData]);

  // Filter archives by date range
  const filteredArchives = useMemo(() => {
    let filtered = archives;

    if (dateFilter.from) {
      filtered = filtered.filter(archive => archive.date >= dateFilter.from);
    }

    if (dateFilter.to) {
      filtered = filtered.filter(archive => archive.date <= dateFilter.to);
    }

    return filtered;
  }, [archives, dateFilter]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, archives]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredArchives.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedArchives = filteredArchives.slice(startIndex, endIndex);

  const handleDownload = (archive: Archive) => {
    if (!archive?.url) {
      alert(t('archives.error.missingUrl'));
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = archive.url;
      link.rel = 'noopener';
      link.download = `archive-${archive.date}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to initiate archive download:', err);
      alert(t('archives.error.failed'));
    }
  };

  const handleBatchDownload = async () => {
    const archivesToDownload = filteredArchives.filter(archive =>
      selectedArchives.has(archive.date)
    );

    if (archivesToDownload.length === 0) {
      alert(t('archives.error.selectOne'));
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: archivesToDownload.length });

    // Download archives sequentially with a small delay to avoid browser blocking
    for (let i = 0; i < archivesToDownload.length; i++) {
      const archive = archivesToDownload[i];
      setDownloadProgress({ current: i + 1, total: archivesToDownload.length });

      try {
        handleDownload(archive);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to download archive ${archive.date}:`, err);
      }
    }

    setIsDownloading(false);
    setDownloadProgress({ current: 0, total: 0 });
    setSelectedArchives(new Set());
  };

  const toggleArchiveSelection = (date: string) => {
    const newSelection = new Set(selectedArchives);
    if (newSelection.has(date)) {
      newSelection.delete(date);
    } else {
      newSelection.add(date);
    }
    setSelectedArchives(newSelection);
  };

  const selectAll = () => {
    setSelectedArchives(new Set(filteredArchives.map(a => a.date)));
  };

  const deselectAll = () => {
    setSelectedArchives(new Set());
  };

  const clearDateFilter = () => {
    setDateFilter({ from: '', to: '' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-xl mb-4">{t('archives.error.loading')}</div>
        <p className="text-gray-600">{t('archives.error.tryAgain')}</p>
      </div>
    );
  }

  const latestArchive = archives.length > 0 ? archives[0] : null;
  const totalSize = archives.reduce((acc, curr) => acc + curr.size, 0);
  const formattedTotalSize = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
  const selectedSize = filteredArchives
    .filter(a => selectedArchives.has(a.date))
    .reduce((acc, curr) => acc + curr.size, 0);
  const formattedSelectedSize = (selectedSize / (1024 * 1024)).toFixed(2) + ' MB';

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('archives.title')}</h1>
      <p className="text-gray-600 mb-8">
        {t('archives.subtitle')}
      </p>

      {/* Archive Info */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('archives.info.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <Database className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700">{t('archives.info.total')}</h3>
            <p className="text-2xl font-bold text-primary-600 mt-2">{archives.length}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700">{t('archives.info.size')}</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">{formattedTotalSize}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700">{t('archives.info.latest')}</h3>
            <p className="text-lg font-bold text-purple-600 mt-2">
              {latestArchive ? new Date(latestArchive.updated).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('archives.filter.title')}
          </h2>
          {(dateFilter.from || dateFilter.to) && (
            <button
              onClick={clearDateFilter}
              className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              {t('archives.filter.clear')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
              {t('archives.filter.from')}
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
              {t('archives.filter.to')}
            </label>
            <input
              id="date-to"
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        {filteredArchives.length < archives.length && (
          <p className="mt-4 text-sm text-gray-600">
            {t('archives.filter.showing').replace('{count}', filteredArchives.length.toString()).replace('{total}', archives.length.toString())}
          </p>
        )}
      </div>

      {/* Batch Download Controls */}
      {filteredArchives.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{t('archives.batch.title')}</h2>
              <p className="text-sm text-gray-600">
                {selectedArchives.size > 0 ? (
                  <>
                    {t('archives.batch.selected').replace('{count}', selectedArchives.size.toString()).replace('{size}', formattedSelectedSize)}
                  </>
                ) : (
                  t('archives.batch.instruction')
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={selectAll}
                disabled={selectedArchives.size === filteredArchives.length}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckSquare className="h-4 w-4" />
                {t('archives.select.all')}
              </button>
              <button
                onClick={deselectAll}
                disabled={selectedArchives.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Square className="h-4 w-4" />
                {t('archives.select.none')}
              </button>
              <button
                onClick={handleBatchDownload}
                disabled={selectedArchives.size === 0 || isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? t('archives.download.downloading') : t('archives.download.selected').replace('{count}', selectedArchives.size.toString())}
              </button>
            </div>
          </div>
          {isDownloading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('archives.download.progress').replace('{current}', downloadProgress.current.toString()).replace('{total}', downloadProgress.total.toString())}
                </span>
                <span className="text-sm font-medium text-primary-600">
                  {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archives List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('archives.list.title')}</h2>
          {filteredArchives.length > 0 && (
            <span className="text-sm text-gray-500">
              {t('common.page')} {currentPage} {t('common.of')} {totalPages}
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {filteredArchives.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {archives.length === 0 ? t('archives.list.empty') : t('archives.list.noMatch')}
            </div>
          ) : (
            paginatedArchives.map((archive: Archive) => {
              const isSelected = selectedArchives.has(archive.date);
              return (
                <div
                  key={archive.date}
                  className={`p-6 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => toggleArchiveSelection(archive.date)}
                      className="mt-1 p-2 hover:bg-gray-100 rounded transition-colors"
                      aria-label={isSelected ? 'Deselect archive' : 'Select archive'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-6 w-6 text-primary-600" />
                      ) : (
                        <Square className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {t('archives.item.title').replace('{date}', new Date(archive.date).toLocaleDateString(language === 'hr' ? 'hr-HR' : 'en-US', { dateStyle: 'full' }))}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{t('archives.item.size').replace('{size}', (archive.size / (1024 * 1024)).toFixed(2) + ' MB')}</span>
                        <span>•</span>
                        <span>{t('archives.item.updated').replace('{date}', new Date(archive.updated).toLocaleTimeString())}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(archive)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Download className="h-4 w-4" />
                    {t('archives.item.download')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm font-medium"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.previous')}</span>
            </button>

            <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 text-xs sm:text-sm shadow-inner">
              <span className="text-gray-500">{t('common.page')}</span>
              <span className="font-bold text-primary-600">{currentPage}</span>
              <span className="text-gray-400">/</span>
              <span className="font-bold text-gray-700">{totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm font-medium"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">{t('common.next')}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
