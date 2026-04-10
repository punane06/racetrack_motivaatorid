import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SessionCard } from '../features/frontDesk/SessionCard';

const baseSession = {
  id: '1',
  label: 'Test Session',
  status: 'upcoming',
  drivers: [],
};

describe('SessionCard', () => {
  it('shows Delete Session and DriverEditor for upcoming', () => {
    render(
      <SessionCard
        session={{ ...baseSession, status: 'upcoming' }}
        onDelete={() => {}}
        onAddDriver={() => {}}
        onEditDriver={() => {}}
        onRemoveDriver={() => {}}
      />
    );
    expect(screen.getByText('Delete Session')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/driver name/i)).toBeInTheDocument();
  });

  it('hides Delete Session and DriverEditor for active', () => {
    render(
      <SessionCard
        session={{ ...baseSession, status: 'active' }}
        onDelete={() => {}}
        onAddDriver={() => {}}
        onEditDriver={() => {}}
        onRemoveDriver={() => {}}
      />
    );
    expect(screen.queryByText('Delete Session')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/driver name/i)).not.toBeInTheDocument();
  });

  it('shows status badge with correct color', () => {
    render(
      <SessionCard
        session={{ ...baseSession, status: 'finished' }}
        onDelete={() => {}}
        onAddDriver={() => {}}
        onEditDriver={() => {}}
        onRemoveDriver={() => {}}
      />
    );
    expect(screen.getByText('finished')).toBeInTheDocument();
  });
});
