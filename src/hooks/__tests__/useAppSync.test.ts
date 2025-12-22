import { renderHook, act } from '@testing-library/react-hooks';
import { useAppSync } from '../useAppSync';
import { useQueryClient } from '@tanstack/react-query';
import { useTransactionsData } from '../../contexts/TransactionsDataContext';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('../../contexts/TransactionsDataContext', () => ({
  useTransactionsData: jest.fn(),
}));

jest.mock('../../lib/queryKeys', () => ({
  queryKeys: {
    transactions: { all: () => ['transactions'] },
    accounts: { all: () => ['accounts'] },
    costCenters: { all: () => ['costCenters'] },
    projects: { all: () => ['projects'] },
    organizations: { all: () => ['organizations'] },
    reports: { all: () => ['reports'] },
    classifications: { all: () => ['classifications'] },
  },
}));

describe('useAppSync', () => {
  const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
  const mockRefreshContext = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    (useTransactionsData as jest.Mock).mockReturnValue({
      refreshAll: mockRefreshContext,
    });
  });

  it('refreshAll invalidates queries and calls context refresh', async () => {
    const { result } = renderHook(() => useAppSync());

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(7); // 7 keys in our mock list
    expect(mockRefreshContext).toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('handles errors gracefully', async () => {
    mockInvalidateQueries.mockRejectedValueOnce(new Error('Fail'));
    const showToast = jest.fn();

    const { result } = renderHook(() => useAppSync({ showToast }));

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Fail') || expect.stringContaining('فشل'));
    expect(result.current.isRefreshing).toBe(false);
  });
});
