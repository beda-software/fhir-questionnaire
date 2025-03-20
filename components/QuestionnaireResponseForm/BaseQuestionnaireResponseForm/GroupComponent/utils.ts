import { QuestionnaireResponseItem } from 'fhir/r4b';

export function getInitialItemCount(items: QuestionnaireResponseItem[], parentPath: string[], linkId: string) {
    if (!parentPath.length) {
        return items.filter((questionnaireResponseItem) => questionnaireResponseItem.linkId === linkId).length;
    }
    const initialItems = getItemsByPath(items, parentPath);
    return initialItems.filter((item) => item?.linkId === linkId).length;
}

function getItemsByPath(items: QuestionnaireResponseItem[], parentPath: string[]) {
    const linkIdsWithIndexList = getLinkIdsWithIndexList(parentPath);
    return linkIdsWithIndexList.reduce((currentItems, linkIdWithIndex) => {
        const { linkId, index } = linkIdWithIndex;
        const itemsByLinkId = currentItems.filter((i) => i.linkId === linkId);
        const targetItem = index !== undefined ? itemsByLinkId[index] : itemsByLinkId[0];
        return targetItem?.item || [];
    }, items);
}

function getLinkIdsWithIndexList(parentPath: string[]) {
    return parentPath.reduce<{ linkId: string; index?: number }[]>((result, current, position, fullPath) => {
        const isNotItems = current !== 'items' && isNaN(Number(current));
        if (isNotItems) {
            const hasMoreItems = position + 2 < fullPath.length;
            const nextIsItems = hasMoreItems && fullPath[position + 1] === 'items';
            const nextIsNumber = hasMoreItems && !isNaN(Number(fullPath[position + 2]));
            const index = nextIsItems && nextIsNumber ? Number(fullPath[position + 2]) : undefined;
            result.push({ linkId: current, index });
        }
        return result;
    }, []);
}
