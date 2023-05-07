import classnames from "classnames-ts/src/classNames";
import { FileInfo } from "../../types/ServerMessage";
import prettyBytes from 'pretty-bytes';

interface Props {
    content: FileInfo;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const FileContent = ({ content }: Props) => {
    return (
        <div className={classnames("file-content-holder", "col-2")}>
            <div className={classnames("metaData-content")}>
                <span className={classnames("size")}> Size: <span>{prettyBytes(content?.metaData?.size)}</span>
                </span>
            </div>
            <br></br>
            <span className={classnames("file-content")}>
                {content.data}
            </span>
        </div>
    );
};
