import React, { useState, useEffect, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import { useArabicLanguage } from '../../../services/ArabicLanguageService';
import SearchableSelect, { type SearchableSelectOption } from '../../Common/SearchableSelect';
import { lineItemsCatalogService, type CatalogItem } from '../../../services/line-items-catalog';

interface LineItemSelectorProps {
    orgId: string;
    value: string | null;
    onChange: (item: any | null) => void;
    disabled?: boolean;
}

export const LineItemSelector: React.FC<LineItemSelectorProps> = ({
    orgId,
    value,
    onChange,
    disabled = false
}) => {
    const { t, isRTL, texts } = useArabicLanguage();
    const [options, setOptions] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;

        const fetchItems = async () => {
            setLoading(true);

            try {
                // Fetch catalog items from the correct service (matches inventory page)
                const data = await lineItemsCatalogService.list(orgId, false);

                if (active && data) {
                    setOptions(data);
                }
            } catch (err) {
                console.error('Failed to fetch catalog items', err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchItems();

        return () => {
            active = false;
        };
    }, [orgId]);

    const treeOptions = useMemo(() => {
        // 1. Build a map of items and their children for tree conversion
        const byParent: Record<string, CatalogItem[]> = {};
        const roots: CatalogItem[] = [];
        const allById: Record<string, CatalogItem> = {};

        options.forEach(opt => {
            allById[opt.id] = opt;
        });

        options.forEach(opt => {
            if (opt.parent_id && allById[opt.parent_id]) {
                if (!byParent[opt.parent_id]) byParent[opt.parent_id] = [];
                byParent[opt.parent_id].push(opt);
            } else {
                roots.push(opt);
            }
        });

        // 2. Recursive function to build SearchableSelectOption tree
        const makeNode = (item: CatalogItem): SearchableSelectOption => {
            const children = (byParent[item.id] || [])
                .sort((a, b) => a.code.localeCompare(b.code))
                .map(makeNode);

            const name = isRTL ? (item.name_ar || item.name) : item.name;
            const code = item.code || '';

            return {
                value: item.id,
                label: `${code} - ${name}`,
                searchText: `${code} ${item.name || ''} ${item.name_ar || ''}`.toLowerCase(),
                disabled: !item.is_selectable,
                children: children.length > 0 ? children : undefined,
                title: item.is_selectable ? undefined : (isRTL ? 'هذا البند غير قابل للاختيار - اختر بنداً فرعياً' : 'This item is not selectable - choose a sub-item')
            };
        };

        return roots
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(makeNode);
    }, [options, isRTL]);

    const flatOptions = useMemo(() => {
        // Find which IDs have children to identify leaf nodes
        const parentIds = new Set(options.map(o => o.parent_id).filter(Boolean));

        return options
            .filter(opt => {
                // If explicitly marked selectable, include it
                if (opt.is_selectable) return true;
                // Fallback: If it's active and has no children, consider it a leaf node (selectable)
                return opt.is_active && !parentIds.has(opt.id);
            })
            .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
            .map(opt => {
                const name = isRTL ? (opt.name_ar || opt.name) : opt.name;
                const code = opt.code || '';
                return {
                    value: opt.id,
                    label: `${code} - ${name}`,
                    searchText: `${code} ${opt.name || ''} ${opt.name_ar || ''}`.toLowerCase(),
                    disabled: false
                };
            });
    }, [options, isRTL]);

    const handleSelect = (selectedId: string) => {
        if (!selectedId) {
            onChange(null);
            return;
        }
        const item = options.find(o => o.id === selectedId) || null;

        if (item) {
            // Standard CatalogItem shape from lineItemsCatalogService
            onChange(item);
        } else {
            onChange(null);
        }
    };

    if (loading && options.length === 0) {
        return <CircularProgress size={24} />;
    }

    return (
        <SearchableSelect
            id="line-item-selector"
            value={value || ''}
            options={flatOptions}
            treeOptions={treeOptions}
            showDrilldownModal={true}
            onChange={handleSelect}
            placeholder={t(texts.costAnalysis.searchCatalog) || "Search..."}
            disabled={disabled}
            clearable
            compact
        />
    );
};

export default LineItemSelector;
