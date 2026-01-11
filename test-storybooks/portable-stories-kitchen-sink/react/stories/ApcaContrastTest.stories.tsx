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

export const Default: Story = {
  render: () => (
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
    </div>
  ),
};
