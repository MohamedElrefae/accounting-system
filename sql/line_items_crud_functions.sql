-- =====================================================
-- LINE ITEMS CRUD FUNCTIONS - COMPLETE SET
-- =====================================================

-- 1. CREATE/ADD LINE ITEM FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_item_add(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_line_item_add(
    p_invoice_id UUID,
    p_item_code VARCHAR(50),
    p_item_name VARCHAR(255),
    p_quantity DECIMAL(10,2),
    p_unit_price DECIMAL(10,2),
    p_discount DECIMAL(10,2) DEFAULT 0,
    p_tax_amount DECIMAL(10,2) DEFAULT 0,
    p_is_active BOOLEAN DEFAULT TRUE
) RETURNS JSON AS $$
DECLARE
    v_line_item_id UUID;
    v_total_amount DECIMAL(10,2);
    v_result JSON;
BEGIN
    -- Generate new UUID for line item
    v_line_item_id := gen_random_uuid();
    
    -- Calculate total amount
    v_total_amount := (p_quantity * p_unit_price) - p_discount + p_tax_amount;
    
    -- Insert new line item
    INSERT INTO line_items (
        line_item_id,
        invoice_id,
        item_code,
        item_name,
        quantity,
        unit_price,
        discount,
        tax_amount,
        total_amount,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_line_item_id,
        p_invoice_id,
        p_item_code,
        p_item_name,
        p_quantity,
        p_unit_price,
        p_discount,
        p_tax_amount,
        v_total_amount,
        p_is_active,
        NOW(),
        NOW()
    );
    
    -- Build result JSON
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Line item added successfully',
        'line_item_id', v_line_item_id,
        'total_amount', v_total_amount,
        'created_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error adding line item: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 2. READ/GET LINE ITEM FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_item_get(UUID);

CREATE OR REPLACE FUNCTION fn_line_item_get(
    p_line_item_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_line_item RECORD;
BEGIN
    -- Get line item details
    SELECT 
        li.line_item_id,
        li.invoice_id,
        li.item_code,
        li.item_name,
        li.quantity,
        li.unit_price,
        li.discount,
        li.tax_amount,
        li.total_amount,
        li.is_active,
        li.created_at,
        li.updated_at,
        i.invoice_number
    INTO v_line_item
    FROM line_items li
    LEFT JOIN invoices i ON li.invoice_id = i.invoice_id
    WHERE li.line_item_id = p_line_item_id;
    
    -- Check if line item exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Line item not found',
            'line_item_id', p_line_item_id
        );
    END IF;
    
    -- Build result JSON
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Line item retrieved successfully',
        'data', json_build_object(
            'line_item_id', v_line_item.line_item_id,
            'invoice_id', v_line_item.invoice_id,
            'invoice_number', v_line_item.invoice_number,
            'item_code', v_line_item.item_code,
            'item_name', v_line_item.item_name,
            'quantity', v_line_item.quantity,
            'unit_price', v_line_item.unit_price,
            'discount', v_line_item.discount,
            'tax_amount', v_line_item.tax_amount,
            'total_amount', v_line_item.total_amount,
            'is_active', v_line_item.is_active,
            'created_at', v_line_item.created_at,
            'updated_at', v_line_item.updated_at
        )
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error retrieving line item: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 3. UPDATE LINE ITEM FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_item_update(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION fn_line_item_update(
    p_line_item_id UUID,
    p_item_code VARCHAR(50) DEFAULT NULL,
    p_item_name VARCHAR(255) DEFAULT NULL,
    p_quantity DECIMAL(10,2) DEFAULT NULL,
    p_unit_price DECIMAL(10,2) DEFAULT NULL,
    p_discount DECIMAL(10,2) DEFAULT NULL,
    p_tax_amount DECIMAL(10,2) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_current_record RECORD;
    v_new_total_amount DECIMAL(10,2);
    v_result JSON;
BEGIN
    -- Get current record
    SELECT * INTO v_current_record
    FROM line_items
    WHERE line_item_id = p_line_item_id;
    
    -- Check if line item exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Line item not found',
            'line_item_id', p_line_item_id
        );
    END IF;
    
    -- Calculate new total amount using provided or current values
    v_new_total_amount := (
        COALESCE(p_quantity, v_current_record.quantity) * 
        COALESCE(p_unit_price, v_current_record.unit_price)
    ) - COALESCE(p_discount, v_current_record.discount) 
      + COALESCE(p_tax_amount, v_current_record.tax_amount);
    
    -- Update line item
    UPDATE line_items SET
        item_code = COALESCE(p_item_code, item_code),
        item_name = COALESCE(p_item_name, item_name),
        quantity = COALESCE(p_quantity, quantity),
        unit_price = COALESCE(p_unit_price, unit_price),
        discount = COALESCE(p_discount, discount),
        tax_amount = COALESCE(p_tax_amount, tax_amount),
        total_amount = v_new_total_amount,
        updated_at = NOW()
    WHERE line_item_id = p_line_item_id;
    
    -- Build result JSON
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Line item updated successfully',
        'line_item_id', p_line_item_id,
        'old_total_amount', v_current_record.total_amount,
        'new_total_amount', v_new_total_amount,
        'updated_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error updating line item: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 4. TOGGLE ACTIVE STATUS FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_item_toggle_active(UUID);

CREATE OR REPLACE FUNCTION fn_line_item_toggle_active(
    p_line_item_id UUID
) RETURNS JSON AS $$
DECLARE
    v_current_status BOOLEAN;
    v_new_status BOOLEAN;
    v_result JSON;
BEGIN
    -- Get current active status
    SELECT is_active INTO v_current_status
    FROM line_items
    WHERE line_item_id = p_line_item_id;
    
    -- Check if line item exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Line item not found',
            'line_item_id', p_line_item_id
        );
    END IF;
    
    -- Toggle status
    v_new_status := NOT v_current_status;
    
    -- Update line item
    UPDATE line_items SET
        is_active = v_new_status,
        updated_at = NOW()
    WHERE line_item_id = p_line_item_id;
    
    -- Build result JSON
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Line item status toggled successfully',
        'line_item_id', p_line_item_id,
        'old_status', v_current_status,
        'new_status', v_new_status,
        'status_text', CASE WHEN v_new_status THEN 'Active' ELSE 'Inactive' END,
        'updated_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error toggling line item status: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 5. DELETE LINE ITEM FUNCTION (SOFT DELETE)
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_item_delete(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_line_item_delete(
    p_line_item_id UUID,
    p_hard_delete BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
    v_line_item RECORD;
    v_result JSON;
BEGIN
    -- Get line item details before deletion
    SELECT 
        line_item_id,
        invoice_id,
        item_code,
        item_name,
        total_amount,
        is_active
    INTO v_line_item
    FROM line_items
    WHERE line_item_id = p_line_item_id;
    
    -- Check if line item exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Line item not found',
            'line_item_id', p_line_item_id
        );
    END IF;
    
    -- Perform deletion based on type
    IF p_hard_delete THEN
        -- Hard delete - permanently remove record
        DELETE FROM line_items
        WHERE line_item_id = p_line_item_id;
        
        v_result := json_build_object(
            'success', TRUE,
            'message', 'Line item permanently deleted',
            'deletion_type', 'hard_delete',
            'line_item_id', p_line_item_id,
            'deleted_item_code', v_line_item.item_code,
            'deleted_total_amount', v_line_item.total_amount,
            'deleted_at', NOW()
        );
    ELSE
        -- Soft delete - mark as inactive
        UPDATE line_items SET
            is_active = FALSE,
            updated_at = NOW()
        WHERE line_item_id = p_line_item_id;
        
        v_result := json_build_object(
            'success', TRUE,
            'message', 'Line item deactivated (soft delete)',
            'deletion_type', 'soft_delete',
            'line_item_id', p_line_item_id,
            'item_code', v_line_item.item_code,
            'previous_status', v_line_item.is_active,
            'current_status', FALSE,
            'updated_at', NOW()
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error deleting line item: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 6. GET ALL LINE ITEMS FOR INVOICE FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS fn_line_items_get_by_invoice(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_line_items_get_by_invoice(
    p_invoice_id UUID,
    p_active_only BOOLEAN DEFAULT TRUE
) RETURNS JSON AS $$
DECLARE
    v_line_items JSON;
    v_summary JSON;
    v_total_amount DECIMAL(10,2);
    v_item_count INTEGER;
    v_result JSON;
BEGIN
    -- Get line items
    SELECT 
        json_agg(
            json_build_object(
                'line_item_id', li.line_item_id,
                'item_code', li.item_code,
                'item_name', li.item_name,
                'quantity', li.quantity,
                'unit_price', li.unit_price,
                'discount', li.discount,
                'tax_amount', li.tax_amount,
                'total_amount', li.total_amount,
                'is_active', li.is_active,
                'created_at', li.created_at,
                'updated_at', li.updated_at
            ) ORDER BY li.created_at
        ),
        SUM(li.total_amount),
        COUNT(*)
    INTO v_line_items, v_total_amount, v_item_count
    FROM line_items li
    WHERE li.invoice_id = p_invoice_id
    AND (NOT p_active_only OR li.is_active = TRUE);
    
    -- Build summary
    v_summary := json_build_object(
        'invoice_id', p_invoice_id,
        'total_line_items', COALESCE(v_item_count, 0),
        'total_amount', COALESCE(v_total_amount, 0),
        'active_only_filter', p_active_only
    );
    
    -- Build result JSON
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Line items retrieved successfully',
        'summary', v_summary,
        'line_items', COALESCE(v_line_items, '[]'::JSON)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error retrieving line items: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all functions were created successfully
SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'fn_line_item%'
ORDER BY routine_name;