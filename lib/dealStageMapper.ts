// Map lead status to deal stage
export function mapLeadStatusToDealStage(leadStatus: string): string {
    switch (leadStatus.toUpperCase()) {
        case 'WARM':
            return 'HOT';
        case 'HOT':
            return 'HOT';
        case 'QUALIFIED':
            return 'QUALIFIED';
        case 'CLOSED':
            return 'WON';
        case 'DEAD':
            return 'LOST';
        case 'NEW':
        case 'CONTACTED':
        default:
            return 'NEW';
    }
}
