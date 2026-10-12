import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const setup = () => {
  const user = userEvent.setup();
  render(<App seed={1} />);
  return { user, result: () => screen.getByTestId('formula-result').textContent };
};

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  const input = screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input[type=text]' });
  await user.clear(input);
  await user.type(input, `${text}{Enter}`);
}

describe('App', () => {
  it('shows the North Sea preset result on load', () => {
    const { result } = setup();
    expect(result()).toBe('1,024 MMSTB');
    expect(screen.getByRole('button', { name: 'North Sea sandstone' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('derives the area from length × width', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Metric' }));
    await typeInto(user, 'Length', '10');
    await typeInto(user, 'Width', '3');
    expect(screen.getByTestId('area')).toHaveTextContent('30.0 km²');
  });

  it('recomputes STOIIP when an input changes', async () => {
    const { user, result } = setup();
    await user.click(screen.getByRole('radio', { name: 'Metric' }));
    await typeInto(user, 'Gross thickness', '160'); // double the preset's 80 m
    expect(result()).toBe('325.7 × 10⁶ Sm³'); // 2 × 162.84
  });

  it('deselects the preset after a manual edit', async () => {
    const { user } = setup();
    await typeInto(user, 'Porosity', '20');
    expect(screen.getByRole('button', { name: 'North Sea sandstone' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clamps out-of-range input', async () => {
    const { user } = setup();
    await typeInto(user, 'Porosity', '95');
    expect(screen.getByLabelText(/^Porosity/, { selector: 'input[type=text]' })).toHaveValue('40.0');
  });

  it('switches between field and metric units', async () => {
    const { user, result } = setup();
    await user.click(screen.getByRole('radio', { name: 'Metric' }));
    expect(screen.getByRole('radio', { name: 'Metric' })).toHaveAttribute('aria-checked', 'true');
    expect(result()).toBe('162.8 × 10⁶ Sm³');
    expect(screen.getByTestId('area')).toHaveTextContent('30.0 km²');
  });

  it('applies a preset', async () => {
    const { user, result } = setup();
    await user.click(screen.getByRole('button', { name: 'Small onshore' }));
    expect(result()).not.toBe('1,024 MMSTB');
    expect(screen.getByLabelText(/^Length/, { selector: 'input[type=text]' })).toHaveValue('1.55'); // 2.5 km in miles
  });

  it('shows Monte Carlo P90 ≤ P50 ≤ P10', () => {
    setup();
    const read = (label: string) => {
      const card = screen.getByText(label).closest('.pcard') as HTMLElement;
      return parseFloat(within(card).getByText(/[\d,]+(\.\d+)?/, { selector: '.pv' }).textContent!.replace(/,/g, ''));
    };
    const [p90, p50, p10] = [read('P90 · low'), read('P50 · best'), read('P10 · high')];
    expect(p90).toBeLessThan(p50);
    expect(p50).toBeLessThan(p10);
  });

  it('narrows the distribution to a point when all spreads are zero', async () => {
    const { user } = setup();
    for (const input of screen.getAllByLabelText(/spread percent$/)) {
      await user.clear(input);
      await user.type(input, '0{Enter}');
    }
    const values = ['P90 · low', 'P50 · best', 'P10 · high'].map(
      l => (screen.getByText(l).closest('.pcard') as HTMLElement).querySelector('.pv')!.textContent,
    );
    expect(new Set(values).size).toBe(1);
    expect(values[0]).toContain('1,024');
  });
});
