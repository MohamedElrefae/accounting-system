-- =====================================================
-- CHILD LINE ITEMS CREATION FUNCTIONS
-- =====================================================

-- Function to generate next child line item code
-- Replicates the accounts tree logic for line items
DROP FUNCTION IF EXISTS fn_get_next_line_item_code(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION fn_get_next_line_item_code(
    p_transaction_id UUID,
    p_parent_item_code VARCHAR DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_suggested_code VARCHAR(50);
    v_siblings RECORD;
    v_parent_code VARCHAR(50);
    v_result JSON;
BEGIN
    -- If no parent provided, suggest next available root-level code
    IF p_parent_item_code IS NULL OR p_parent_item_code = '' THEN
        SELECT COALESCE(MAX(CAST(item_code AS INTEGER)), 0) + 1
        INTO v_suggested_code
        FROM transaction_line_items
        WHERE transaction_id = p_transaction_id
        AND item_code ~ '^\d+$'  -- Only numeric codes
        AND item_code NOT LIKE '%-%';  -- No dash codes
        
        v_suggested_code := COALESCE(v_suggested_code::VARCHAR, '1');
    ELSE
        -- Generate child code based on parent
        v_parent_code := p_parent_item_code;
        
        -- Check existing siblings for pattern detection
        SELECT COUNT(*) as dash_count,
               COUNT(CASE WHEN item_code NOT LIKE '%-%' AND item_code LIKE v_parent_code || '%' THEN 1 END) as numeric_count
        INTO v_siblings
        FROM transaction_line_items
        WHERE transaction_id = p_transaction_id
        AND (item_code LIKE v_parent_code || '-%' OR 
             (item_code NOT LIKE '%-%' AND item_code LIKE v_parent_code || '%' AND LENGTH(item_code) > LENGTH(v_parent_code)));
        
        -- Decide on pattern: if more numeric siblings exist, use numeric style
        IF v_siblings.numeric_count >= v_siblings.dash_count THEN
            -- Numeric style (e.g., 1 -> 11, 12, 13)
            SELECT COALESCE(MAX(
                CAST(SUBSTRING(item_code FROM LENGTH(v_parent_code) + 1) AS INTEGER)
            ), 0) + 1
            INTO v_suggested_code
            FROM transaction_line_items
            WHERE transaction_id = p_transaction_id
            AND item_code NOT LIKE '%-%'
            AND item_code LIKE v_parent_code || '%'
            AND LENGTH(item_code) > LENGTH(v_parent_code)
            AND SUBSTRING(item_code FROM LENGTH(v_parent_code) + 1) ~ '^\d+$';
            
            v_suggested_code := v_parent_code || COALESCE(v_suggested_code::VARCHAR, '1');
        ELSE
            -- Dash style (e.g., 1 -> 1-1, 1-2, 1-3)
            SELECT COALESCE(MAX(
                CAST(SPLIT_PART(item_code, '-', -1) AS INTEGER)
            ), 0) + 1
            INTO v_suggested_code
            FROM transaction_line_items
            WHERE transaction_id = p_transaction_id
            AND item_code LIKE v_parent_code || '-%';
            
            v_suggested_code := v_parent_code || '-' || COALESCE(v_suggested_code::VARCHAR, '1');
        END IF;
    END IF;
    
    -- Build result
    v_result := json_build_object(
        'success', TRUE,
        'suggested_code', v_suggested_code,
        'parent_code', p_parent_item_code,
        'pattern_used', CASE 
            WHEN p_parent_item_code IS NULL THEN 'root_numeric'
            WHEN v_siblings.numeric_count >= v_siblings.dash_count THEN 'numeric'
            ELSE 'dash'
        END
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error generating line item code: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create child line item with auto-suggestions
DROP FUNCTION IF EXISTS fn_create_child_line_item(UUID, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, VARCHAR);

CREATE OR REPLACE FUNCTION fn_create_child_line_item(
    p_transaction_id UUID,
    p_parent_item_code VARCHAR DEFAULT NULL,
    p_suggested_code VARCHAR DEFAULT NULL,
    p_item_name VARCHAR DEFAULT NULL,
    p_quantity DECIMAL DEFAULT 1.0,
    p_percentage DECIMAL DEFAULT 100.0,
    p_unit_price DECIMAL DEFAULT 0.0,
    p_discount_amount DECIMAL DEFAULT 0.0,
    p_tax_amount DECIMAL DEFAULT 0.0,
    p_unit_of_measure VARCHAR DEFAULT 'piece'
) RETURNS JSON AS $$
DECLARE
    v_line_item_id UUID;
    v_item_code VARCHAR(50);
    v_item_name VARCHAR(255);
    v_item_name_ar VARCHAR(255);
    v_line_number INTEGER;
    v_parent_item RECORD;
    v_result JSON;
BEGIN
    -- Generate new UUID
    v_line_item_id := gen_random_uuid();
    
    -- Use provided code or generate new one
    IF p_suggested_code IS NOT NULL AND p_suggested_code != '' THEN
        v_item_code := p_suggested_code;
    ELSE
        -- Get suggested code
        SELECT (fn_get_next_line_item_code(p_transaction_id, p_parent_item_code)->>'suggested_code')
        INTO v_item_code;
    END IF;
    
    -- Get next line number
    SELECT COALESCE(MAX(line_number), 0) + 1
    INTO v_line_number
    FROM transaction_line_items
    WHERE transaction_id = p_transaction_id;
    
    -- If parent exists, inherit some properties and create descriptive names
    IF p_parent_item_code IS NOT NULL AND p_parent_item_code != '' THEN
        SELECT *
        INTO v_parent_item
        FROM transaction_line_items
        WHERE transaction_id = p_transaction_id
        AND item_code = p_parent_item_code
        LIMIT 1;
        
        -- Generate child names based on parent
        IF p_item_name IS NOT NULL AND p_item_name != '' THEN
            v_item_name := p_item_name;
            v_item_name_ar := p_item_name;
        ELSE
            v_item_name := COALESCE(v_parent_item.item_name, 'Parent Item') || ' - Sub Item';
            v_item_name_ar := COALESCE(v_parent_item.item_name_ar, 'البند الأساسي') || ' - بند فرعي';
        END IF;
    ELSE
        -- Root level item
        v_item_name := COALESCE(p_item_name, 'New Line Item');
        v_item_name_ar := COALESCE(p_item_name, 'بند جديد');
    END IF;
    
    -- Insert the new child line item
    INSERT INTO transaction_line_items (
        id,
        transaction_id,
        line_number,
        item_code,
        item_name,
        item_name_ar,
        description,
        description_ar,
        quantity,
        percentage,
        unit_price,
        discount_amount,
        tax_amount,
        unit_of_measure,
        analysis_work_item_id,
        sub_tree_id,
        line_item_id,
        org_id,
        created_at,
        updated_at
    ) VALUES (
        v_line_item_id,
        p_transaction_id,
        v_line_number,
        v_item_code,
        v_item_name,
        v_item_name_ar,
        'Child item for ' || COALESCE(p_parent_item_code, 'root'),
        'بند فرعي لـ ' || COALESCE(p_parent_item_code, 'الجذر'),
        p_quantity,
        p_percentage,
        p_unit_price,
        p_discount_amount,
        p_tax_amount,
        p_unit_of_measure,
        CASE WHEN v_parent_item.analysis_work_item_id IS NOT NULL 
             THEN v_parent_item.analysis_work_item_id 
             ELSE NULL END,
        CASE WHEN v_parent_item.sub_tree_id IS NOT NULL 
             THEN v_parent_item.sub_tree_id 
             ELSE NULL END,
        CASE WHEN v_parent_item.line_item_id IS NOT NULL 
             THEN v_parent_item.line_item_id 
             ELSE NULL END,
        CASE WHEN v_parent_item.org_id IS NOT NULL 
             THEN v_parent_item.org_id 
             ELSE (SELECT org_id FROM transactions WHERE id = p_transaction_id LIMIT 1) END,
        NOW(),
        NOW()
    );
    
    -- Build success result
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Child line item created successfully',
        'line_item', json_build_object(
            'id', v_line_item_id,
            'item_code', v_item_code,
            'item_name', v_item_name,
            'item_name_ar', v_item_name_ar,
            'line_number', v_line_number,
            'parent_code', p_parent_item_code,
            'calculated_total', (p_quantity * p_unit_price * (p_percentage / 100.0) - p_discount_amount + p_tax_amount)
        )
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error creating child line item: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get line items tree structure
DROP FUNCTION IF EXISTS fn_get_line_items_tree(UUID);

CREATE OR REPLACE FUNCTION fn_get_line_items_tree(
    p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_tree_items JSON;
BEGIN
    -- Build hierarchical structure based on item_code patterns
    WITH RECURSIVE line_items_tree AS (
        -- Root level items (no dash or single number)
        SELECT 
            tli.*,
            0 as depth,
            ARRAY[tli.line_number] as sort_path,
            tli.item_code as root_code
        FROM transaction_line_items tli
        WHERE tli.transaction_id = p_transaction_id
        AND (tli.item_code ~ '^\d+$' AND tli.item_code NOT LIKE '%-%')
        
        UNION ALL
        
        -- Child items (codes that extend parent codes)
        SELECT 
            child.*,
            parent.depth + 1,
            parent.sort_path || child.line_number,
            parent.root_code
        FROM transaction_line_items child
        INNER JOIN line_items_tree parent ON (
            child.transaction_id = p_transaction_id AND
            child.transaction_id = parent.transaction_id AND
            (
                -- Dash pattern: parent_code-number
                (child.item_code LIKE parent.item_code || '-%' AND 
                 SPLIT_PART(child.item_code, '-', 2) ~ '^\d+$' AND 
                 array_length(string_to_array(child.item_code, '-'), 1) = array_length(string_to_array(parent.item_code, '-'), 1) + 1)
                OR
                -- Numeric pattern: parent_code + digits
                (child.item_code LIKE parent.item_code || '%' AND 
                 child.item_code != parent.item_code AND
                 NOT child.item_code LIKE '%-%' AND
                 SUBSTRING(child.item_code FROM LENGTH(parent.item_code) + 1) ~ '^\d+$')
            )
        )
    )
    SELECT json_agg(
        json_build_object(
            'id', lit.id,
            'item_code', lit.item_code,
            'item_name', lit.item_name,
            'item_name_ar', lit.item_name_ar,
            'line_number', lit.line_number,
            'depth', lit.depth,
            'quantity', lit.quantity,
            'percentage', lit.percentage,
            'unit_price', lit.unit_price,
            'discount_amount', lit.discount_amount,
            'tax_amount', lit.tax_amount,
            'calculated_total', (
                COALESCE(lit.quantity, 0) * 
                COALESCE(lit.unit_price, 0) * 
                (COALESCE(lit.percentage, 100) / 100.0) - 
                COALESCE(lit.discount_amount, 0) + 
                COALESCE(lit.tax_amount, 0)
            ),
            'unit_of_measure', lit.unit_of_measure,
            'description', lit.description,
            'description_ar', lit.description_ar,
            'analysis_work_item_id', lit.analysis_work_item_id,
            'sub_tree_id', lit.sub_tree_id,
            'has_children', EXISTS(
                SELECT 1 FROM transaction_line_items child 
                WHERE child.transaction_id = p_transaction_id 
                AND (
                    child.item_code LIKE lit.item_code || '-%' OR
                    (child.item_code LIKE lit.item_code || '%' AND 
                     child.item_code != lit.item_code AND
                     NOT child.item_code LIKE '%-%')
                )
            ),
            'sort_path', lit.sort_path
        ) ORDER BY lit.sort_path
    )
    INTO v_tree_items
    FROM line_items_tree lit;
    
    v_result := json_build_object(
        'success', TRUE,
        'transaction_id', p_transaction_id,
        'tree_items', COALESCE(v_tree_items, '[]'::JSON)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error building line items tree: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Test function creation
SELECT 'CHILD LINE ITEMS FUNCTIONS' as status, 'Functions created successfully!' as message;