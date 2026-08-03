import { lazy, Suspense, type ComponentProps } from 'react';

const AiToolDownloadBar = lazy(() => import('./AiToolDownloadBar'));

type Props = ComponentProps<typeof AiToolDownloadBar>;

/** Defers teacher export helpers until a result is ready to download. */
export default function AiToolDownloadBarLazy(props: Props) {
  return (
    <Suspense fallback={null}>
      <AiToolDownloadBar {...props} />
    </Suspense>
  );
}
