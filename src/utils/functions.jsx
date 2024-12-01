import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classes) => twMerge(clsx(...classes));
export const isMobile = window.screen.width < 720;
