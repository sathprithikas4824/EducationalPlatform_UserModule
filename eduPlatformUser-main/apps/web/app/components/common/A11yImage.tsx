"use client";

import Image, { ImageProps } from "next/image";

// Use this component for every image. TypeScript forces a choice:
//   alt="description"  → meaningful image (screen reader reads it)
//   decorative={true}  → visual-only image (screen reader skips it)

export interface MeaningfulImageProps extends ImageProps {
  decorative?: false;
}

export interface DecorativeImageProps extends Omit<ImageProps, "alt"> {
  decorative: true;
  alt?: never;
}

export type A11yImageProps = MeaningfulImageProps | DecorativeImageProps;

export default function A11yImage(props: A11yImageProps) {
  if (props.decorative === true) {
    // Destructure to remove `decorative` before spreading onto <Image>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { decorative, ...rest } = props as DecorativeImageProps;
    return <Image {...(rest as ImageProps)} alt="" aria-hidden="true" />;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { decorative, ...rest } = props as MeaningfulImageProps;
  return <Image {...(rest as ImageProps)} />;
}

// Plain <img> version for dynamic backend URLs where next/image cannot be used
export function A11yImg(
  props:
    | (React.ImgHTMLAttributes<HTMLImageElement> & { decorative?: false })
    | (Omit<React.ImgHTMLAttributes<HTMLImageElement>, "alt"> & { decorative: true; alt?: never })
) {
  if (props.decorative === true) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { decorative, ...rest } = props as { decorative: true } & React.ImgHTMLAttributes<HTMLImageElement>;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} alt="" aria-hidden="true" />;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { decorative, ...rest } = props as { decorative?: false } & React.ImgHTMLAttributes<HTMLImageElement>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} />;
}
