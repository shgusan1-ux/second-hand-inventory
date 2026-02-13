'use client';

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
    children?: ReactNode;
    showRadialGradient?: boolean;
}

export const AuroraBackground = ({
    className,
    children,
    showRadialGradient = true,
    ...props
}: AuroraBackgroundProps) => {
    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center bg-slate-950 text-white transition-bg",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className={cn(
                        `
            [--white-gradient:linear-gradient(to_bottom,white,white)]
            [--dark-gradient:linear-gradient(to_bottom,var(--slate-950),var(--slate-950))]
            [--aurora:linear-gradient(215deg,var(--indigo-400)_0%,var(--indigo-300)_20%,var(--blue-500)_40%,var(--emerald-300)_60%,var(--violet-400)_80%)]
            [background-image:var(--aurora),var(--dark-gradient)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[60px] invert-0
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--aurora),var(--dark-gradient)] 
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
            pointer-events-none
            absolute -inset-[10px] opacity-60 will-change-transform`,
                        showRadialGradient &&
                        `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
                    )}
                ></div>
            </div>
            {children}
        </div>
    );
};
