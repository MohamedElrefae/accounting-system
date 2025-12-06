-- Check if enriched fields exist in the view
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines_enriched'
ORDER BY ordinal_position;

-- Check what fields are stored in report_datasets for the enriched view
SELECT name, table_name, 
       jsonb_array_length(fields) as field_count,
       fields
FROM report_datasets 
WHERE table_name = 'transaction_lines_enriched';

-- Refresh the fields for enriched views
SELECT * FROM refresh_all_dataset_fields();
