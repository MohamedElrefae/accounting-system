import sys

def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python read_sql_chunk.py <filename> <start_byte> [max_bytes]\n")
        sys.exit(1)

    filename = sys.argv[1]
    start_byte = int(sys.argv[2])
    max_bytes = int(sys.argv[3]) if len(sys.argv) > 3 else 50000

    try:
        with open(filename, 'rb') as f:
            f.seek(start_byte)
            
            chunk = b""
            current_bytes = 0
            
            while True:
                line = f.readline()
                if not line:
                    break
                
                chunk += line
                current_bytes += len(line)
                
                if current_bytes >= max_bytes:
                    # check for ; at end of trimmed line
                    if line.strip().endswith(b';'):
                        break
            
            if chunk:
                # Write chunk to stdout without extra newline (binary safe)
                try:
                    sys.stdout.buffer.write(chunk.decode('utf-8-sig').encode('utf-8'))
                except AttributeError:
                    # Python 3, stdout.buffer is binary
                    sys.stdout.buffer.write(chunk.decode('utf-8-sig').encode('utf-8'))
                sys.stdout.flush()
                # Write metadata to stderr
                sys.stderr.write(f"-- NEXT_OFFSET: {start_byte + len(chunk)}\n")
            else:
                sys.stderr.write("-- END_OF_FILE\n")

    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
