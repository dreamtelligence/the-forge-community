import { TextGradientScroll } from "@/components/ui/text-gradient-scroll";

function TextGradientScrollExample() {
  return (
    <div className="min-h-[200vh] w-full relative">
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-5xl mx-auto p-4 items-center">
          <div className="flex p-4 text-2xl pt-14 w-[700px] mx-auto h-[500px] flex-col items-start justify-end pointer-events-auto">
            <TextGradientScroll text="The text gradient scroll component is designed to enhance user interaction by providing a visually dynamic effect as the user scrolls through the text. Unlike static text, this effect offers a more engaging visual experience with smooth color transitions that change as the text is scrolled. The animated gradient shifts add a modern and interactive touch to the user experience. This example was created using Tailwind CSS and Framer Motion." />
          </div>
        </div>
      </div>

      <div className="h-[200vh]" aria-hidden="true" />
    </div>
  );
}

export { TextGradientScrollExample };
