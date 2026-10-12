CREATE TABLE chart_of_accounts (
    account_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_code VARCHAR(30) NOT NULL UNIQUE,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_headers (
    journal_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_number VARCHAR(40) NOT NULL UNIQUE,
    journal_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_lines (
    journal_line_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_id BIGINT NOT NULL,
    line_number INTEGER NOT NULL,
    account_id BIGINT NOT NULL,
    description TEXT,
    debit_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_journal_lines_header
        FOREIGN KEY (journal_id)
        REFERENCES journal_headers (journal_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_journal_lines_account
        FOREIGN KEY (account_id)
        REFERENCES chart_of_accounts (account_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_journal_lines_number
        UNIQUE (journal_id, line_number),
    CONSTRAINT ck_journal_lines_debit_nonnegative
        CHECK (debit_amount >= 0),
    CONSTRAINT ck_journal_lines_credit_nonnegative
        CHECK (credit_amount >= 0),
    CONSTRAINT ck_journal_lines_nonzero_amount
        CHECK (debit_amount > 0 OR credit_amount > 0)
);
