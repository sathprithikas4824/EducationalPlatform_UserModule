"use client";

import Image, { ImageProps } from "next/image";

// TypeScript discriminated union — you MUST provide either:
//   alt="description of the image"   (meaningful image)
//   decorative={true}                (purely visual, screen reader skips it)
// It is impossible to use this component without choosing one.

type MeaningfulImage = Omit<ImageProps, "alt"> & {
  alt: string;
  decorative?: false;
};

type DecorativeImage = Omit<ImageProps, "alt"> & {
  decorative: true;
  alt?: never;
};

type A11yImageProps = MeaningfulImage | DecorativeImage;

export default function A11yImage(props: A11yImageProps) {
  if (props.decorative) {
    const { decorative: _d, ...rest } = props;
    return <Image {...rest} alt="" aria-hidden="true" />;
  }
  return <Image {...props} />;
}

// Plain <img> version for cases where next/image cannot be used (dynamic backend URLs)
type A11yImgProps = React.ImgHTMLAttributes<HTMLImageElement> & (
  | { alt: string; decorative?: false }
  | { decorative: true; alt?: never }
);

export function A11yImg(props: A11yImgProps) {
  if (props.decorative) {
    const { decorative: _d, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} alt="" aria-hidden="true" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} />;
}
