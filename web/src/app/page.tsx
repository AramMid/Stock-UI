import { MainLayout } from '@/components/layout/MainLayout';
import { Grid, GridItem } from '@/components/layout/Grid';

export default function Home() {
  return (
    <MainLayout>
      <h1>🎨 Dark Theme Demo</h1>
      <p>Try clicking the theme toggle in the header!</p>

      <Grid columns={12} gap="lg">
        <GridItem span={6}>
          <h2>Primary Color</h2>
          <div style={{ 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            padding: '1rem', 
            borderRadius: '8px',
            margin: '1rem 0'
          }}>
            Primary Background
          </div>
        </GridItem>

        <GridItem span={6}>
          <h2>Surface Color</h2>
          <div style={{ 
            backgroundColor: 'var(--surface)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid var(--border)',
            margin: '1rem 0'
          }}>
            Surface Background
          </div>
        </GridItem>

        <GridItem span={4}>
          <h3>Text Colors</h3>
          <p style={{ color: 'var(--text-primary)' }}>Primary Text</p>
          <p style={{ color: 'var(--text-secondary)' }}>Secondary Text</p>
          <p style={{ color: 'var(--text-disabled)' }}>Disabled Text</p>
        </GridItem>

        <GridItem span={4}>
          <h3>Status Colors</h3>
          <p style={{ color: 'var(--success)' }}>Success Message</p>
          <p style={{ color: 'var(--error)' }}>Error Message</p>
          <p style={{ color: 'var(--warning)' }}>Warning Message</p>
        </GridItem>

        <GridItem span={4}>
          <h3>Theme Info</h3>
          <p>Current theme is stored in localStorage</p>
          <p>System preference is respected</p>
          <p>Smooth transitions applied</p>
        </GridItem>
      </Grid>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
        <h2>Theme Features</h2>
        <Grid columns={3} gap="md">
          <GridItem span={1}>
            <h4>🌓 Auto Detection</h4>
            <p>Detects system preference automatically</p>
          </GridItem>
          <GridItem span={1}>
            <h4>💾 Persistent</h4>
            <p>Remembers your theme choice</p>
          </GridItem>
          <GridItem span={1}>
            <h4>⚡ Smooth Transition</h4>
            <p>Beautiful color transitions</p>
          </GridItem>
        </Grid>
      </div>
    </MainLayout>
  );
}