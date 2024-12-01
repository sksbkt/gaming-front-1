import { useEffect, useRef } from "react";
import AnimatedTitle from "./AnimatedTitle";
import gsap from "gsap";
import RoundedCorners from "./RoundedCorner";
import { isMobile } from "../utils/functions";
import Button from "./Button";

const Story = () => {
  const frameRef = useRef(null);
  const handleMouseEnter = () => {};

  const handleMouseUp = (event) => {};
  const handleMouseLeave = () => {
    const element = frameRef.current;
    gsap.to(element, {
      duration: 0.3,
      rotateX: 0,
      rotateY: 0,
      ease: "power1.inOut",
    });
  };
  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;

    const element = frameRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((x - centerX) / x) * isMobile ? -2 : -5;
    const rotateY = ((y - centerY) / y) * isMobile ? 2 : 5;

    gsap.to(element, {
      duration: 0.3,
      rotateX,
      rotateY,
      transformPerspective: 500,
      ease: "power1.inOut",
    });
  };
  return (
    <section
      id="story"
      className="min-h-dvh w-screen bg-black text-blue-50"
    >
      <div className="flex size-full flex-col items-center py-10 pb-24">
        <p className="font-general text-sm uppercase md:text-[10px]">
          The multiversal ip world
        </p>
        <div className="relative w-full">
          <AnimatedTitle
            title={`The st<b>o</b>ry of<br/> hidden realm`}
            sectionId="#story"
            containerClass={
              "mt-5 pointer-events-none mix-blend-difference relative z-10"
            }
          />
          <div className="story-img-container">
            <div className="story-img-mask">
              <div className="story-img-content">
                <img
                  ref={frameRef}
                  src="img/entrance.webp"
                  alt="entrance"
                  className="object-contain"
                  style={{ scale: "1.15" }}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseEnter={handleMouseEnter}
                  onMouseMove={handleMouseMove}
                />
              </div>
            </div>
            <RoundedCorners />
          </div>
        </div>
        <div className="-mt-40 flex w-full justify-center sm:-mt-28 md:-mt-60 md:me-44 md:justify-end">
          <div className="flex h-full w-fit flex-col items-center md:items-start">
            <p className="mt-3 max-w-sm text-center font-circular-web text-violet-50 md:text-start">
              Where realms converge, lies Zentry and the boundless pillar.
              Discover its secrets and shape your fate amidst infinite
              opportunities.
            </p>
            <Button
              id="realm-btn"
              title="discover prologue"
              containerClass="mt-5"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Story;
