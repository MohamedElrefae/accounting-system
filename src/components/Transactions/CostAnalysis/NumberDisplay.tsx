import React from 'react';
import { Box, Typography } from '@mui/material';
import type { TypographyProps } from '@mui/material';


interface NumberDisplayProps extends Omit<TypographyProps, 'children'> {
    value: string | number;
    prefix?: string;
    suffix?: string;
}

/**
 * A specialized display component for numeric values that ensures LTR directionality
 * even in RTL layouts, preventing numbers and their symbols from being jumbled.
 */
const NumberDisplay: React.FC<NumberDisplayProps> = ({
    value,
    prefix = '',
    suffix = '',
    sx,
    ...typographyProps
}) => {
    return (
        <Typography
            component="span"
            sx={{
                display: 'inline-block',
                unicodeBidi: 'plaintext', // Helps maintain correct ordering
                ...sx
            }}
            {...typographyProps}
        >
            <Box component="span" dir="ltr" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                {prefix}{value}{suffix}
            </Box>
        </Typography>
    );
};

export default NumberDisplay;
