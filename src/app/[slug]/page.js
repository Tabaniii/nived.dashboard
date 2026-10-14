import CardRoutePage, { generateMetadata as generateCardMetadata } from '@/app/r/[slug]/page';

// The root slug and existing NFC route render the same page without redirecting.
export const instant = false;
export const generateMetadata = generateCardMetadata;

export default CardRoutePage;
