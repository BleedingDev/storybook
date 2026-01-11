import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = {
  title: 'Accessibility/APCA Contrast Test',
  parameters: {
    a11y: {
      context: '#apca-test-root',
    },
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj;

const Sample = () => (
  <div id="apca-test-root" style={{ backgroundColor: 'rgb(255, 255, 255)', padding: 24 }}>
    <p
      style={{
        color: 'rgb(170, 170, 170)',
        fontSize: 16,
        fontWeight: 400,
        margin: 0,
      }}
    >
      Low contrast text (should fail APCA)
    </p>
    <p
      style={{
        color: 'rgb(0, 0, 0)',
        fontSize: 16,
        fontWeight: 400,
        marginTop: 8,
      }}
    >
      High contrast text (should pass)
    </p>
    <p
      data-apca-usecase="sub-fluent"
      style={{
        color: 'rgb(90, 90, 90)',
        fontSize: 10,
        fontWeight: 400,
        marginTop: 12,
      }}
    >
      Sub-fluent label (should fail size at gold/silver)
    </p>
  </div>
);

export const Default: Story = {
  render: Sample,
  parameters: {
    a11y: {
      apca: {
        level: 'gold',
        useCase: 'body',
      },
    },
  },
};

export const Silver: Story = {
  render: Sample,
  parameters: {
    a11y: {
      apca: {
        level: 'silver',
        useCase: 'body',
      },
    },
  },
};
