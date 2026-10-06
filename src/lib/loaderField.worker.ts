import { runLoaderField, type FieldSetup, type LoaderField } from './loaderField'

export type FieldMessage =
  | { type: 'start'; canvas: OffscreenCanvas; setup: FieldSetup }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'release' }

let field: LoaderField | undefined

self.onmessage = ({ data }: MessageEvent<FieldMessage>) => {
  if (data.type === 'start') field = runLoaderField(data.canvas, data.setup)
  else if (data.type === 'resize') field?.resize(data.width, data.height, data.dpr)
  else field?.release()
}
