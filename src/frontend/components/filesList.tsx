import { useCallback, useEffect, useRef, useState } from "react";

import { ElementInfo } from "../../types/ElementInfo";

import { getElementStyle } from "../utils/stylesSelectors";
import { LVL_UP_DIR } from "../../constants";

import classNames from "classnames-ts";
import { getIcon } from "../icons/icons";

interface Props {
  elementsList: ElementInfo[];
  active?: {
    onClickElement: (element: ElementInfo) => void;
    updateNextElement: (nextElement: ElementInfo) => void;
    selected: number;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const FilesList = ({ elementsList, active }: Props) => {
  const listRef = useRef(null);
  const selectedItemRef = useRef(null);

  const [selected, setSelected] = useState<number | undefined>(active?.selected);

  const setSelectedWithUpdate = useCallback((index: number, newElementsList?: ElementInfo[]) => {
    const usingElementsList = newElementsList || elementsList;
    active.updateNextElement(usingElementsList[index]);
    setSelected(index);
  }, [setSelected, elementsList]);

  function onHoverElement(index) {
    // setSelectedWithUpdate(index); TODO
  };

  if (active !== undefined) {
    const onKeyPressEvent = (event: KeyboardEvent) => {
      const container = listRef.current;
      const selectedItem = selectedItemRef.current;
      const elementTop = selectedItem.offsetTop;
      const elementHeight = selectedItem.offsetHeight;
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      if (event.code === "ArrowDown") {
        if (selected + 1 < elementsList.length) {
          event.preventDefault();
          elementsList && setSelectedWithUpdate(selected + 1);
          if (elementTop + elementHeight > containerTop + containerHeight) {
            container.scrollTop = elementTop - containerHeight;
          }
        }
      }
      if (event.code === "ArrowUp") {
        if (selected - 1 >= 0) {
          event.preventDefault();
          elementsList && setSelectedWithUpdate(selected - 1);
          if (elementTop - 5 * elementHeight < containerTop) {
            container.scrollTop = elementTop - 4 * elementHeight;
          }
        }
      }
      if (event.code === "ArrowLeft") {
        if (elementsList[0].name === LVL_UP_DIR) {
          active.onClickElement(elementsList[0]);
        }
      }
      if (event.code === "ArrowRight" && elementsList[selected].name !== LVL_UP_DIR ||
        event.code === "Enter") {
        active.onClickElement(elementsList[selected]);
      }
    };

    useEffect(() => {
      window.addEventListener("keydown", onKeyPressEvent);
      return () => {
        window.removeEventListener('keydown', onKeyPressEvent);
      };
    });
    useEffect(() => {
      setSelected(0);
    }, [elementsList]);
  }

  const getElementProps = (element: ElementInfo, index: number) => {
    return active ? {
      onClick: () => {
        active.onClickElement(element);
      },
      onMouseEnter: () => {
        onHoverElement(index);
      },
    } : {};
  };

  return (
    <div ref={listRef} className={classNames("filesList", "col-2")}>
      <ul >
        {elementsList && elementsList.length > 0 && elementsList.map(
          (element, index) => {
            const className = getElementStyle(
              element,
              active && {
                selected: selected === index,
              }
            );
            return <li ref={selected === index ? selectedItemRef : null}
              key={element.name}
              className={className}
              {...getElementProps(element, index)}
            >{getIcon(element.type)} {element.name} {element.temp}</li>;
          }
        )}
      </ul>
    </div>
  );
};